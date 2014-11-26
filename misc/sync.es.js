'use strict';

var elasticsearch = require('elasticsearch');
var Q = require('q');

var cip = require('../lib/cip-methods.js');
var cip_categories = require('../lib/cip-categories.js');
var asset_mapping = require('../lib/asset-mapping.js');

var client = new elasticsearch.Client({requestTimeout: 30 * 60 * 1000 });

var sync_all = false;

// Aliases of specific catalogs that are to be synced.
var sync_catalogs_whitelist = false;
var categories = {};

var ASSETS_PER_REQUEST = 100;

/*=== Defining modes to run the syncronization in ===*/

// What modes can we run the elasticsearch script in?
var MODES = {
    recent: "recent",
    all: "all",
    catalog: "catalog",
    single: "single"
};
var MODE_DESCRIPTIONS = {
    recent: "Syncronize the most recently changed assets.",
    all: "Syncronize all assets across all catalogs.",
    catalog: "Syncronize only a single catalog or a set of comma seperated catalogs.",
    single: "Syncronize only a single asset or a comma seperated list of assets."
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
            reference = args[3].split(",");
        }
    }
}

// Report any runtime errors on mode selection.
if(!mode) {
    console.error("Invalid mode - please select from:");
    for(var m in MODES) {
        console.error(" * " +MODES[m]+ ": "+MODE_DESCRIPTIONS[m]);
    }
    process.exit(1);
} else if(mode === MODES.single) {
    // In the single mode, each asset is a combination of a catalog alias
    // and the asset ID, eg. DNT/101
    for(var r in reference) {
        reference[r] = reference[r].split("/");
    }
}

function is_relevant_catalog(catalog_alias) {
    if(mode === MODES.catalog) {
        // Are there any of the split catalogs that maches?
        for(var r in reference) {
            if(reference[r] == catalog_alias) {
                return true;
            }
        }
        return false;
    } else if(mode === MODES.single) {
        for(var r in reference) {
            if(reference[r][0] == catalog_alias) {
                return true;
            }
        }
        return false;
    } else {
        return true;
    }
}

function is_relevant_asset(catalog_alias, asset_id) {
    if(mode === MODES.single) {
        // Are there any of the split Catalog/ID 2-tuples that matches?
        for(var r in reference) {
            if(reference[r][0] == catalog_alias && parseInt(reference[r][1]) == asset_id) {
                return true;
            }
        }
        return false;
    } else {
        return is_relevant_catalog(catalog_alias);
    }
}

// TODO: Consider implementing the modes in a smarter way - especially the
// single mode has an overhead, as it is not requesting an asset directly but
// rather through the traversal of all assets in the page.

console.log("Running in mode: " + MODE_DESCRIPTIONS[mode]);

/*=== END: Defining modes to run the syncronization in ===*/

// Creates the index in the Elasticsearch index.
function create_index() {
    return client.indices.create({
        index: 'assets'
    }).then(function(resp) {
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
function determine_searchability(formatted_result) {
    // TODO: Find out if this asset has relations to an asset that is in
    // a "Rotationsbilleder" catalog. If this is the case, make this asset,
    // non-searchable.
    // Alternatively this asset might have "Friskærings-status" equal to
    // "Er friskåret", in which case it should not be shown in search results.
    var deferred = Q.defer();

    if(formatted_result.id === 4875) {
        console.log(formatted_result);
        deferred.resolve( false );
        /*
        console.log(formatted_result);
        // Get relevant related assets
        cip.get_related_assets('isalternate')
        .then(function parse_relations(related_assets) {
            console.log( related_assets );
        });
        */
    } else {
        deferred.resolve( true );
    }

    return deferred.promise;
}

// Handles a partial result from cumulus.
function handle_results(nm, catalog, items) {
    var asset_promises = [];
    if(items == undefined && items == null && items.length == 0) {
        throw new Error("The items argument was undefined, null or of zero length.");
    }

    for(var i=0; i < items.length; ++i) {
        var asset = items[i];
        var formatted_result = asset_mapping.format_result(asset.fields);

        if(!is_relevant_asset(catalog.alias, formatted_result.id)) {
            continue; // Skip an irrelevant asset.
        }

        var asset_promise = Q.all([
            asset_mapping.extend_metadata(nm, catalog.alias, asset, formatted_result),
            determine_searchability(formatted_result)
        ])
        .spread(function(formatted_result, is_searchable) {
            formatted_result.searchable = is_searchable;

            if(formatted_result.modification_time !== undefined) {
                var re = new RegExp('\\d+');
                var re_result = re.exec(formatted_result.modification_time);
                if(re_result && re_result.length > 0) {
                    formatted_result.modification_time = parseInt(re_result[0]);
                }
            }

            if(formatted_result.categories !== undefined) {
                formatted_result.categories_int = [];
                formatted_result.suggest = {'input': []};

                for(var j=0; j < formatted_result.categories.length; ++j) {
                    if(formatted_result.categories[j].path.indexOf('$Categories') !== 0) {
                        continue;
                    }

                    var path = categories[catalog.alias].get_path(formatted_result.categories[j].id);
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
            formatted_result.catalog = catalog.alias;
            return formatted_result;
        })
        .then(function(formatted_result) {
            var es_id = catalog.alias + '-' + formatted_result.id;
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
            console.error( "Something went wrong indexing an asset" );
            console.error( err.stack );
        });

        asset_promises.push( asset_promise );
    }
    var all_asset_promises = Q.all(asset_promises);
    return all_asset_promises;
}

// Feches the result from Cumulus, on the i'th asset offset.
function get_result(nm, result, i) {
    var deferred = Q.defer();

    result.get(ASSETS_PER_REQUEST, i, function(returnvalue) {
        deferred.resolve( handle_results(nm, result.catalog, returnvalue) );
    });

    return deferred.promise;
}

// Handles an entire catalog.
function handle_catalog(nm, catalog) {
    // Precondition: The catalog has it's alias defined.
    if(catalog.alias === undefined) {
        throw new Error("The catalog's alias was undefined");
    }

    // Get the assets recently published in the catalog.
    return cip.get_recent_assets(nm, catalog, mode === MODES.recent ? '$today-2d' : '2003-04-24' )
    .then(function(result) {
        var partial_results = [];

        for(var i=0; i < result.total_rows; i=i+ASSETS_PER_REQUEST) {
            var page_index = Math.floor(i/ASSETS_PER_REQUEST);
            var total_page_count = Math.floor(result.total_rows/ASSETS_PER_REQUEST);
            console.log("Queuing assets page " + page_index + " / "
                        + total_page_count + " of " + catalog.alias);

            var partial_result = get_result(nm, result, i);
            partial_results.push( partial_result );
        }

        return Q.all( partial_results );
    });
}

console.log("=== Getting ready to start indexing ===");

cip_categories.load_categories()
.then(function(result) {
    // The categories pr catalog has been fetched from Cumulus.
    for(var i=0; i < result.length; ++i) {
        categories[result[i].id] = result[i];
    }
    var categories_count = Object.keys(categories).length;
    console.log("Loaded categories for", categories_count, "catalogs");
})
.then(function() {
    return create_index().then(function() {
        console.log('Index created');
    }, function(err) {
        if(err.message === "IndexAlreadyExistsException[[assets] already exists]") {
            return; // No worries ...
        }
        console.log('Failed to create the index:', err);
    });
})
.then(function() {
    return cip.init_session()
    .then(function(nm) {
        return cip.get_catalogs(nm)
        .then(function(catalogs) {
            var promises = [];

            for(var c=0; c < catalogs.length; c++) {
                var catalog = catalogs[c];
                if(is_relevant_catalog(catalog.alias)) {
                    promises.push( handle_catalog(nm, catalog) );
                } else {
                    console.log("Skipping " +catalog.alias+ " as this seems irrelevant for the mode.");
                }
            }

            return Q.all(promises);
        });
    });
})
.then(function() {
    console.log("=== All done ===");
    // We are ready to die ..
    process.exit(0);
})
.fail(function (error) {
    console.error("An error occurred");
    console.error(error);
});
