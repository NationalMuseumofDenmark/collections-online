'use strict';

var process = require('process');
var elasticsearch = require('elasticsearch');
var Q = require('q');

var cip = require('./lib/cip-methods.js');
var cip_categories = require('./lib/cip-categories.js');
var asset_mapping = require('./lib/asset-mapping.js');

var client = new elasticsearch.Client();

// XXX: Change this to do a full sync
var sync_all = false;
var categories = {};

function create_index() {
    var deferred = Q.defer();

    client.indices.create({
        index: 'assets'
    }).then(function(resp) {
        console.log('Index created');
        deferred.resolve(resp);
    }, function(resp) {
        deferred.reject(resp);
    });

    return deferred.promise;
}

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

function handle_results(catalog, items) {
   if(items !== undefined && items.length > 0) {
        for(var i=0; i < items.length; ++i) {
            var formatted_result = asset_mapping.format_result(items[i].fields);
            var es_id = catalog.alias + '-' + formatted_result.id;

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

            client.index({
                index: 'assets',
                type: 'asset',
                id: es_id,
                body: formatted_result
            }).then(function(resp) {
                console.log('Indexed ' + resp._id);
            }, function(resp) {
                console.log('Error indexing ' + resp._id);
            });
        }
    }
}

function get_result(result, i) {
    var deferred = Q.defer();

    result.get(100, i, function(returnvalue) {
        handle_results(result.catalog, returnvalue);
        deferred.resolve();
    });

    return deferred.promise;
}

function handle_catalog(nm, catalog) {
    var deferred = Q.defer();
    var promises = [];

    if(catalog.alias !== undefined) {
        cip.get_recent_assets(nm, catalog, sync_all ? '2003-12-24' : '$today-2d', function(result) {
            for(var i=0; i < result.total_rows; i=i+100) {
                promises.push(get_result(result, i));
            }

            Q.all(promises).then(function() {
                deferred.resolve();
            });
        });
    } else {
        deferred.resolve();
    }

    return deferred.promise;
}

cip_categories.load_categories().then(function(result) {
    for(var i=0; i < result.length; ++i) {
        categories[result[i].id] = result[i];
    }
}).then(function() {
    create_index().then(function() {
        console.log('Index created');
    }, function() {
        console.log('Failed, index probably already exists');
    });
}).then(function() {
    cip.init_session().then(function(nm) {
        cip.get_catalogs(nm).then(function(catalogs) {
            var promises = [];

            for(var i=0; i < catalogs.length; ++i) {
                promises.push(handle_catalog(nm, catalogs[i]));
            }

            Q.all(promises).then(function() {
                process.exit(0);
            });
        });
    });
});
