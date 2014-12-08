'use strict';

var elasticsearch = require('elasticsearch');
var Q = require('q');

var cip = require('../lib/cip-methods.js');
var cip_categories = require('../lib/cip-categories.js');
var asset_mapping = require('../lib/asset-mapping.js');

var client = new elasticsearch.Client({requestTimeout: 30 * 60 * 1000 });

var ASSETS_PER_REQUEST = 100;

/*=== Defining modes to run the syncronization in ===*/

// What modes can we run the elasticsearch script in?
var MODES = {
    recent: 'recent',
    all: 'all',
    catalog: 'catalog',
    single: 'single'
};
var MODE_DESCRIPTIONS = {
    recent: 'Syncronize the most recently changed assets.',
    all: 'Syncronize all assets across all catalogs.',
    catalog: 'Syncronize only a single catalog or a set of comma seperated catalogs.',
    single: 'Syncronize only a single asset or a comma seperated list of assets.'
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

// Report any runtime errors on mode selection.
if(!mode) {
    console.error('Invalid mode - please select from:');
    for(var m in MODES) {
        console.error(' * ' +MODES[m]+ ': '+MODE_DESCRIPTIONS[m]);
    }
    process.exit(1);
} else if(mode === MODES.single) {
    // In the single mode, each asset is a combination of a catalog alias
    // and the asset ID, eg. DNT/101
    for(var r in reference) {
        reference[r] = reference[r].split('-');
    }
}

/*=== END: Defining modes to run the syncronization in ===*/

// Creates the index in the Elasticsearch index.
function create_index() {
    return client.indices.create({
        index: 'assets'
    }).then(function() {
        console.log('Index created');
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

// Determines wether or not an asset should be visible to the user when searching.
function determine_searchability(cip_client, asset, formatted_result) {
    // First of all - we wouldn't like to have search results on assets
    // which have been cropped into seperate assets.
    if(formatted_result.cropping_status && formatted_result.cropping_status.id === 2) {
        return false;
    } else {
        // Second - We wouldn't like assets which are related to assets that are in the
        // "Rotationsbilleder" category - as these are side-views of an object which will be
        // reachable through the front-facing master asset.
        return cip.get_related_assets(asset, 'isalternateof')
        .then(function parse_relations(related_assets) {
            var related_asset_promises = [];
            for(var i in related_assets.ids) {
                var related_asset_id = related_assets.ids[i];
                var related_asset_promise = cip.get_asset(cip_client, formatted_result.catalog, related_asset_id);
                related_asset_promises.push( related_asset_promise );
            }
            return Q.all(related_asset_promises).then(function(related_assets) {
                for(var r in related_assets) {
                    for(var a in related_assets[r]) {
                        var related_asset = related_assets[r][a];
                        var formatted_asset = asset_mapping.format_result(related_asset.fields);
                        for(var c in formatted_asset.categories) {
                            var category = formatted_asset.categories[c];
                            if(category.name === 'Rotationsbilleder') {
                                return false;
                            }
                        }
                    }
                }
                // None of the related assets was a part of the rotational images category.
                return true;
            });
        });
    }
}

var categories = {};
var catalog_page_index = {};
var catalog_index = 0;

// Handle a specific asset from a result page.
function handle_asset(cip_client, asset, catalog_alias) {
    var formatted_result = asset_mapping.format_result(asset.fields);
    formatted_result.catalog = catalog_alias;

    // TODO: Consider making the registration of extenstions to assets metadata
    // more maintainable.
    return Q.all([
        asset_mapping.extend_metadata(cip_client, catalog_alias, asset, formatted_result),
        determine_searchability(cip_client, asset, formatted_result)
    ])
    .spread(function(formatted_result, is_searchable) {
        // TODO: Consider having a field for the values that are checked in the
        // call to determine_searchability, but have the web application decide
        // if it wants to display these or not. Alternatively have publication
        // status reflected in this .searchable field.
        formatted_result.searchable = is_searchable;

        if(formatted_result.modification_time !== undefined) {
            var re = new RegExp('\\d+');
            var re_result = re.exec(formatted_result.modification_time);
            if(re_result && re_result.length > 0) {
                formatted_result.modification_time = parseInt(re_result[0], 10);
            }
        }

        if(formatted_result.categories !== undefined) {
            formatted_result.categories_int = [];
            formatted_result.suggest = {'input': []};

            for(var j=0; j < formatted_result.categories.length; ++j) {
                if(formatted_result.categories[j].path.indexOf('$Categories') !== 0) {
                    continue;
                }

                var path = categories[catalog_alias].get_path(formatted_result.categories[j].id);
                if(path) {
                    for(var k=0; k < path.length; k++) {
                        formatted_result.categories_int.push(path[k].id);

                        if(path[k].name.indexOf('$Categories') === 0) {
                            continue;
                        }

                        formatted_result.suggest.input.push(clean_string(path[k].name));
                    }
                }
            }
        }
        return formatted_result;
    })
    .then(function(formatted_result) {
        var es_id = formatted_result.catalog + '-' + formatted_result.id;
        return client.index({
            index: 'assets',
            type: 'asset',
            id: es_id,
            body: formatted_result
        });
    })
    .then(function(resp) {
        console.log('Successfully indexed ' + resp._id);
    })
    .fail(function(err) {
        console.error( 'Something went wrong indexing an asset' );
        console.error( err.stack );
    });
}

// Handle a specific result page, with assets.
function handle_result_page(cip_client, catalog, result, page_index) {
    var deferred = Q.defer();
    var total_pages = Math.ceil(result.total_rows / ASSETS_PER_REQUEST);
    console.log('Queuing page number', page_index+1, 'of', total_pages+1, 'in the', catalog.alias, 'catalog.');

    result.get(ASSETS_PER_REQUEST, page_index * ASSETS_PER_REQUEST, function(assets_on_page) {
        console.log('Got metadata of page ' +(page_index+1)+ ' from the ' +result.catalog.alias+ ' catalog.');
        var asset_promises = [];
        for(var a in assets_on_page) {
            var asset = assets_on_page[a];
            var asset_promise = handle_asset(cip_client, asset, catalog.alias);
            asset_promises.push( asset_promise );
        }
        Q.all(asset_promises).then(function() {
            // Resolve the page promise once all assets on the page has been resolved.
            deferred.resolve( true );
        });
    }, function(err) {
        deferred.reject( err );
    });

    return deferred.promise;
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
        .then(function() { cip.init_session(true); }) // Re authenticate the session, to keep it alive.
        .then(function() {
            return handle_next_result_page(cip_client, catalog, result);
        });
    } else {
        return true; // No more pages in the result.
    }
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
    return create_index().then(function() {
        console.log('Index created');
    }, function(err) {
        // TODO: Add a recursive check for this message.
        if(err.message === 'IndexAlreadyExistsException[[assets] already exists]') {
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
        for(var c in relevant_catalogs) {
            catalog_aliases.push(relevant_catalogs[c].alias);
        }
        console.log("Indexing from these catalogs:", catalog_aliases.join(","));
        return handle_next_catalog(cip_client, relevant_catalogs);
    });
} else {
    main_queue = main_queue.then(function(cip_client) {
        var asset_promises = [];
        for(var a in reference) {
            var catalog_alias = reference[a][0];
            var asset_id = reference[a][1];
            var asset_promise = cip.get_asset(cip_client, catalog_alias, asset_id)
            .then(function(assets) {
                if(assets.length === 1) {
                    console.log('Queuing asset', assets[0].fields.id, 'from the', catalog_alias, 'catalog.');
                    return handle_asset(cip_client, assets[0], catalog_alias);
                } else {
                    throw new Error( 'No asset with id ' +asset_id+ ' was found in the ' +catalog_alias+ ' catalog.' );
                }
            });
            asset_promises.push( asset_promise );
        }
        return Q.all(asset_promises);
    });
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
    // We are ready to die ..
    process.exit(0);
});