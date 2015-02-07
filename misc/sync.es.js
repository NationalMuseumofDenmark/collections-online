'use strict';

var elasticsearch = require('elasticsearch');
var Q = require('q');

var cip = require('../lib/cip-methods.js');
var cip_categories = require('../lib/cip-categories.js');
var asset_mapping = require('../lib/asset-mapping.js');

var client = new elasticsearch.Client({
    requestTimeout: 30 * 60 * 1000,
    host: process.env.ES_HOST || 'localhost:9200'
});

var ASSETS_PER_REQUEST = 100;

var CM_PR_IN = 2.54;

/*=== Defining modes to run the syncronization in ===*/

// What modes can we run the elasticsearch script in?
var MODES = {
    recent: 'recent',
    all: 'all',
    catalog: 'catalog',
    single: 'single',
    clear: 'clear',
    rotation_ranks: 'rotation_ranks'
};
var MODE_DESCRIPTIONS = {
    recent: 'Syncronize the most recently changed assets.',
    all: 'Syncronize all assets across all catalogs.',
    catalog: 'Syncronize only a single catalog or a set of comma seperated ' +
        'catalogs.',
    single: 'Syncronize only a single asset or a comma seperated list of assets.',
    clear: 'Deletes the entire index - use this before an all mode sync, to' +
        ' remove old indecies.',
    rotation_ranks: 'Update all ranks of artifact rotation assets, this is ' +
        'automatically done at the end of the "all" mode.'
};
var mode, reference;

// A function to check that a user supplied mode is valid.
function is_valid_mode(suggested_mode) {
    for(var mode in MODES) {
        if(suggested_mode === MODES[mode]) {
            return mode;
        }
    }
    return false;
}

function print_usage_and_exit() {
    console.error('Invalid mode - please select from:');
    for(var m in MODES) {
        console.error(' * ' +MODES[m]+ ': '+MODE_DESCRIPTIONS[m]);
    }
    process.exit(1);
}

var args = process.argv;
if(args && args.length <= 2) {
    // No arguments supplied, just node and the app script's path.
    mode = MODES.recent;
} else if(args && args.length >= 3) {
    var suggested_mode = args[2];
    mode = is_valid_mode(suggested_mode);
    if(mode === MODES.catalog || mode === MODES.single) {
        if(args.length >= 4) {
            reference = args[3].split(',');
        }
    }
}

try {
    // Report any runtime errors on mode selection.
    if(!mode) {
        throw new Error( 'Unrecognized mode.' );
    } else if(mode === MODES.single) {
        // In the single mode, each asset is a combination of a catalog alias
        // and the asset ID, eg. DNT/101
        for(var r in reference) {
            reference[r] = reference[r].split('-');
            if(reference[r].length !== 2) {
                throw new Error( 'Every reference in the single mode must '+
                    'contain a catalog alias seperated by a dash (-), '+
                    'ex: ES-1234');
            }
        }
    }
} catch( err ) {
    console.error( err.message );
    print_usage_and_exit();
}

/*=== END: Defining modes to run the syncronization in ===*/

// An array of exceptions and errors thrown when parsing assets.
var asset_exceptions = [];

// Creates the index in the Elasticsearch service.
function create_index() {
    return client.indices.create({
        index: process.env.ES_INDEX || 'assets'
    }).then(function() {
        console.log('Index created.');
    });
}

// Deletes the index in the Elasticsearch service.
function delete_index() {
    return client.indices.delete({
        index: process.env.ES_INDEX || 'assets'
    }).then(function() {
        console.log('Index deleted.');
    });
}

// Cleans up a string, representing a category.
function clean_string(str) {
    var regexp = new RegExp('^[0-9]+[A-Z]+.[0-9]+.[0-9]+ ');
    if(str.search(regexp) === 0) {
        return str.replace(regexp, '');
    }
    regexp = new RegExp('^[A-Z]?[0-9]+[a-z]? - ');
    if(str.search(regexp) === 0) {
        return str.replace(regexp, '');
    }
    regexp = new RegExp('^[A-F] - ');
    if(str.search(regexp) === 0) {
        return str.replace(regexp, '');
    }
    regexp = new RegExp('^[0-9][0-9] ');
    if(str.search(regexp) === 0) {
        return str.replace(regexp, '');
    }
    return str;
}

var categories = {};
var catalog_page_index = {};
var catalog_index = 0;

var DATA_REGEXP = new RegExp('\\d+');

function related_filename_comparison(asset_a, asset_b) {
    var filename_a = asset_a.filename;
    var filename_b = asset_b.filename;
    return filename_a.localeCompare(filename_b);
}

// This list of transformations are a list of functions that takes two
// arguments (cip_client, metadata) and returns a mutated metadata, which
// is passed on to the next function in the list.
var METADATA_TRANSFORMATIONS = [
    function transform_field_names(cip_client, metadata) {
        var transformed_metadata = asset_mapping.format_result( metadata );
        // The catalog will be removed when formatting.
        transformed_metadata.catalog = metadata.catalog;
        return transformed_metadata;
    },
    function transform_modification_time(cip_client, metadata) {
        var re_result = DATA_REGEXP.exec(metadata.modification_time);
        if(re_result && re_result.length > 0) {
            metadata.modification_time = parseInt(re_result[0], 10);
        }
        return metadata;
    },
    function transform_categories_and_derive_suggest(cip_client, metadata) {
        // Transforms the categories.
        if(metadata.categories !== undefined) {
            metadata.categories_int = [];
            metadata.suggest = {'input': []};

            for(var j=0; j < metadata.categories.length; ++j) {
                if(metadata.categories[j].path.indexOf('$Categories') !== 0) {
                    continue;
                }
                var path = categories[metadata.catalog].get_path(metadata.categories[j].id);
                if(path) {
                    for(var k=0; k < path.length; k++) {
                        metadata.categories_int.push(path[k].id);

                        if(path[k].name.indexOf('$Categories') === 0) {
                            continue;
                        }

                        metadata.suggest.input.push(clean_string(path[k].name));
                    }
                }
            }
        }
        return metadata;
    },
    function transform_relations(cip_client, metadata) {
        // Transforms the binary representations of each relation.
        metadata.related_master_assets = cip.parse_binary_relations(
            metadata.related_master_assets);
        metadata.related_sub_assets = cip.parse_binary_relations(
            metadata.related_sub_assets);
        // Sort these by their filename.
        metadata.related_master_assets.sort( related_filename_comparison );
        metadata.related_sub_assets.sort( related_filename_comparison );
        return metadata;
    },
    function derive_in_artifact_rotation_series(cip_client, metadata) {
        // Let's assume it's not.
        metadata.in_artifact_rotation_series = false;
        // Finds out if this asset is in a rotation series.
        // Initially looking at the assets categories - is this the front
        // facing asset in the rotation series?
        for(var c in metadata.categories) {
            var category = metadata.categories[c];
            if(category.name === 'Rotationsbilleder') {
                metadata.in_artifact_rotation_series = true;
                // The asset in Rotationsbilleder is always rank 0.
                metadata.artifact_rotation_series_rank = 0;
                return metadata;
            }
        }
        // Loop through the assets related master assets to find if a
        // master asset is in fact in the correct category to make this
        // asset a part of an artifact rotation series.
        for(var r in metadata.related_master_assets) {
            var master_asset = metadata.related_master_assets[r];
            if(master_asset.relation === '9ed0887f-40e8-4091-a91c-de356c869251') {
                // Get the asset's metadata, to check it's categories.
                return cip.get_asset(cip_client, metadata.catalog, master_asset.id)
                .then(function(master_assets) {
                    if(master_assets.length !== 1) {
                        console.error( master_assets );
                        throw new Error( 'Expected a single master asset, got '+
                        master_assets.length );
                    }
                    var master_asset = master_assets[0];
                    var master_asset_metadata = master_asset.fields;
                    master_asset_metadata = asset_mapping.format_result(
                        master_asset_metadata );
                    for(var c in master_asset_metadata.categories) {
                        var category = master_asset_metadata.categories[c];
                        if(category.name === 'Rotationsbilleder') {
                            metadata.in_artifact_rotation_series = true;
                            return metadata;
                        }
                    }
                    return metadata;
                });
            }
        }
        return metadata;
    },
    function extend_from_master(cip_client, metadata) {
        return asset_mapping.extend_from_master(cip_client, metadata);
    },
    function derive_dimensions_in_cm(cip_client, metadata) {
        metadata.width_cm = metadata.width_in * CM_PR_IN;
        metadata.height_cm = metadata.height_in * CM_PR_IN;
        return metadata;
    },
    function derive_is_searchable(cip_client, metadata) {
        // Compute a value on if it's drafted, part of a rotational series
        // or an original that has more representable croppings.
        // Adds an is_searchable field to the metadata.
        metadata.is_searchable = true; // Let's assume that it is.
        if(metadata.cropping_status &&
            metadata.cropping_status.id === 2) {
            // The croping status is 'has been cropped' / 'Er friskåret'
            metadata.is_searchable = false;
        } else if(!metadata.review_state ||
            (metadata.review_state.id !== 3 && metadata.review_state.id !== 4 ) ) {
            // The asset's review state is neither 3 or 4 (public).
            metadata.is_searchable = false;
        } else if(metadata.in_artifact_rotation_series &&
            metadata.artifact_rotation_series_rank !== 0) {
            // The asset is part of a rotation series but it's not the front.
            metadata.is_searchable = false;
        }
        // Return the updated metedata.
        return metadata;
    }
];

// Runs the metadata transformations.
function transform_metadata( cip_client, metadata, t ) {
    if(t === undefined) {
        t = 0; // Base case
    } else if(t >= METADATA_TRANSFORMATIONS.length) {
        return metadata; // Ensures termination
    }

    var transformation = METADATA_TRANSFORMATIONS[t](cip_client, metadata);
    return Q.when(transformation, function(metadata) {
        return transform_metadata(cip_client, metadata, t+1);
    });
}

// Handle a specific asset from a result page.
function handle_asset(cip_client, asset, catalog_alias) {
    // Starting with the metadata being the raw fields from the CIP
    var metadata = asset.fields;
    // Adding the catalog alias to the assets metadata.
    metadata.catalog = catalog_alias;
    // Perform additional transformations and index the result.
    return transform_metadata( cip_client, metadata )
    .then(function( metadata ) {
        var es_id = metadata.catalog + '-' + metadata.id;
        return client.index({
            index: process.env.ES_INDEX || 'assets',
            type: 'asset',
            id: es_id,
            body: metadata
        });
    })
    .then(function(resp) {
        console.log('Successfully indexed ' + resp._id);
    })
    .fail(function(err) {
        // Push this to the list of asset exceptions.
        asset_exceptions.push({
            asset_id: metadata.id,
            catalog_alias: catalog_alias,
            err: err
        });
        console.error( 'Error indexing the asset ' +catalog_alias+ '-' +
                        metadata.id );
        console.error( err.stack );
    });
}

// Handle a specific result page, with assets.
function handle_result_page(cip_client, catalog, result, page_index) {
    var total_pages = Math.ceil(result.total_rows / ASSETS_PER_REQUEST);
    console.log('Queuing page number', page_index+1, 'of', total_pages, 'in the', catalog.alias, 'catalog.');

    return get_next_result_page(result, page_index*ASSETS_PER_REQUEST, ASSETS_PER_REQUEST)
    .then(function(assets_on_page) {
        console.log('Got metadata of page ' +(page_index+1)+ ' from the ' +result.catalog.alias+ ' catalog.');
        var asset_promises = [];
        for(var a in assets_on_page) {
            var asset = assets_on_page[a];
            var asset_promise = handle_asset(cip_client, asset, catalog.alias);
            asset_promises.push( asset_promise );
        }
        return Q.all(asset_promises);
    });
}

// Recursively handle the assets on pages, giving a breath first traversal
// of the CIP webservice.
function handle_next_result_page(cip_client, catalog, result) {
    var page_index = catalog_page_index[catalog.alias];
    if(page_index * ASSETS_PER_REQUEST < result.total_rows) {
        catalog_page_index[catalog.alias]++;
        return handle_result_page(cip_client, catalog, result, page_index)
        .fail(function(err) {
            console.error('An error happened parsing result page #', page_index, '- skipping this');
            console.error(err.stack ? err.stack : err);
        })
        .then(function() {
            return handle_next_result_page(cip_client, catalog, result);
        });
    } else {
        return true; // No more pages in the result.
    }
}

var ADDITIONAL_FIELDS = [
    '{af4b2e71-5f6a-11d2-8f20-0000c0e166dc}', // Related Sub Assets
    '{af4b2e72-5f6a-11d2-8f20-0000c0e166dc}' // Related Master Assets
];

function get_next_result_page(result, pointer, num_rows) {
    var deferred = Q.defer();

    result.cip.ciprequest( [
            'metadata',
            'getfieldvalues',
            'web'
        ], {
            collection: result.collection_id,
            startindex: pointer,
            maxreturned: num_rows,
            field: ADDITIONAL_FIELDS
        }, function(response) {
            if(response === null) {
                deferred.reject( new Error('The request for field values returned a null result.') );
            } else {
                var returnvalue = [];
                for (var i = 0; i<response.items.length; i++) {
                    // TODO: Consider if this even works - where is cip_asset defined?
                    var asset = new cip_asset.CIPAsset(this, response.items[i], result.catalog);
                    returnvalue.push( asset );
                }
                deferred.resolve( returnvalue );
            }
        }, deferred.reject
    );

    return deferred.promise;
}

// Handle a specific catalog.
function handle_catalog(cip_client, catalog) {
    // Precondition: The catalog has it's alias defined.
    if(catalog === undefined || catalog.alias === undefined) {
        throw new Error('The catalog´s alias was undefined');
    }
    console.log('Queuing catalog', catalog.alias);
    var modified_since = (mode === MODES.recent ? '$today-2d' : '2003-04-24');
    // Let's find out how many pages of assets we have in this catalog.
    return cip.get_recent_assets(cip_client, catalog, modified_since )
    .then(function(result) {
        // Reset the counter.
        catalog_page_index[catalog.alias] = 0;
        return Q.when(handle_next_result_page(cip_client, catalog, result), function() {
            console.log('Done parsing catalog', catalog.alias);
        });
    }, function() {
        console.error('An error occurred getting overview from the catalog');
        return false;
    });
}

// Recursively handle the catalogs, giving a breath first traversal
// of the CIP webservice.
function handle_next_catalog(cip_client, catalogs) {
    if(catalog_index < catalogs.length) {
        var catalog = catalogs[catalog_index];
        catalog_index++;
        return handle_catalog(cip_client, catalog)
        .then(function() {
            return handle_next_catalog(cip_client, catalogs);
        });
    } else {
        return true; // No more catalogs.
    }
}

// Handle a specific asset (when in single mode).
function handle_single_asset(cip_client, catalog, asset_id) {
    // Precondition: The catalog has it's alias defined.
    if(catalog === undefined || catalog.alias === undefined) {
        throw new Error('The catalog´s alias was undefined');
    }
    if(asset_id === undefined) {
        throw new Error('The asset´s id was undefined');
    }
    console.log('Queuing single asset in catalog', catalog.alias, 'asset id =', asset_id);

    // Request a single asset based on it's catalog and id and use the
    // handle_next_result_page method to handle the result.
    var deferred = Q.defer();

    var id_string = 'ID is "' + asset_id + '"';
    cip_client.criteriasearch({
        catalog: catalog
    }, id_string, null, function(result) {
        catalog_page_index[catalog.alias] = 0;
        var result_handle_promise = handle_next_result_page(cip_client, catalog, result);
        deferred.resolve( result_handle_promise );
    }, deferred.reject);

    return deferred.promise;
}

// Let's get started.
console.log('Running in mode: ' + MODE_DESCRIPTIONS[mode]);

var main_queue = cip_categories.load_categories()
.then(function(result) {
    // The categories pr catalog has been fetched from Cumulus.
    for(var i=0; i < result.length; ++i) {
        categories[result[i].id] = result[i];
    }
    var categories_count = Object.keys(categories).length;
    console.log('Loaded categories for', categories_count, 'catalogs');
})
.then(function() {
    return create_index().then(undefined, function(err) {
        // TODO: Add a recursive check for this message.
        if(err.message === 'No Living connections') {
            throw new Error( 'Is the Elasticsearch server running?' );

        } else if(err.message === 'IndexAlreadyExistsException[[assets] already exists]') {
            return; // No worries ...
        }
        console.log('Failed to create the index:', err);
    });
})
.then(cip.init_session);

if(mode === MODES.recent || mode === MODES.all || mode === MODES.catalog) {
    main_queue = main_queue.then(function(cip_client) {
        return [cip_client, cip.get_catalogs(cip_client)];
    })
    .spread(function(cip_client, catalogs) {
        var relevant_catalogs = [];
        if(mode === MODES.catalog) {
            for(var c in catalogs) {
                var catalog = catalogs[c];
                if(reference.indexOf(catalog.alias) !== -1) {
                    relevant_catalogs.push(catalog);
                }
            }
        } else {
            // All catalogs are relevant catalogs.
            relevant_catalogs = catalogs;
        }
        var catalog_aliases = [];
        for(var rc in relevant_catalogs) {
            catalog_aliases.push(relevant_catalogs[rc].alias);
        }
        console.log('Indexing from these catalogs: ', catalog_aliases.join(','));
        return handle_next_catalog(cip_client, relevant_catalogs);
    });
} else if(mode === MODES.single) {
    main_queue = main_queue.then(function(cip_client) {
        var asset_promises = [];
        for(var a in reference) {
            var catalog_alias = reference[a][0];
            var asset_id = reference[a][1];
            var asset_promise = handle_single_asset(
                cip_client,
                {alias: catalog_alias},
                asset_id
            );
            asset_promises.push( asset_promise );
        }
        return Q.all(asset_promises);
    });
} else if(mode === MODES.rotation_ranks) {
    // TODO: Implement a mode that queries the elasticsearch index to find
    // assets that are not a part of 
    throw new Error('The rotation_ranks mode is not implemented yet.');
} else if(mode === MODES.clear) {
    main_queue = main_queue.then( delete_index() );
}

main_queue
.fail(function (error) {
    console.error('An error occurred:');
    if(error !== null && error !== undefined) {
        if(error.stack) {
            console.error( error.stack );
        } else {
            console.error( error );
        }
    } else {
        console.error( 'No details was provided.' );
    }
}).finally(function() {
    console.log('=== All done ===');
    if(asset_exceptions.length > 0) {
        console.error('Some errors occurred indexing assets:');
        for(var e = 0; e < asset_exceptions.length; e++) {
            var ex = asset_exceptions[e];
            console.error('--- Exception '+(e+1)+'/'+asset_exceptions.length+' ('+
                ex.catalog_alias+'-'+ex.asset_id+') ---');
            console.error(ex.err.stack);
        }
    }
    // We are ready to die ..
    process.exit(0);
});
