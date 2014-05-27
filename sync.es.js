var elasticsearch = require('elasticsearch');
var Q = require('q');
var cip = require('./lib/cip-methods.js');
var asset_mapping = require('./lib/asset-mapping.js');

var client = new elasticsearch.Client();

function createIndex() {
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


createIndex().then(function() {
    console.log("Index created");
}, function() {
    console.log("Failed, index probably already exists");
});


cip.init_session(function(nm) {
    cip.get_catalogs(nm, function(catalogs) {
        cip.get_recent_assets(nm, catalogs, '$today-31d', function(catalog, items) {
            if(items != undefined && items.length > 0) {
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
        });
    });
});
