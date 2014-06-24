var elasticsearch = require('elasticsearch');
var Q = require('q');

var cip = require('./lib/cip-methods.js');
var asset_mapping = require('./lib/asset-mapping.js');

var client = new elasticsearch.Client();

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

function handle_catalog(nm, catalog) {
    var deferred = Q.defer();

    if(catalog.alias !== undefined) {
        cip.get_recent_assets(nm, catalog, '$today-2d', function(catalog, items) {
            if(items !== undefined && items.length > 0) {
                for(var i=0; i < items.length; ++i) {
                    var formatted_result = asset_mapping.format_result(items[i].fields);
                    var es_id = catalog.alias + '-' + formatted_result['id'];

                    formatted_result['catalog'] = catalog.alias;

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

            deferred.resolve();
        });
    } else {
        deferred.resolve();
    }

    return deferred.promise;
}

create_index().then(function() {
    console.log("Index created");
}, function() {
    console.log("Failed, index probably already exists");
});



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
