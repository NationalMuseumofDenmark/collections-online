var elasticsearch = require('elasticsearch');
var querystring = require('querystring');
var cip = require('../cip-methods.js');
var helpers = {};

var page_size = 10;

helpers.catalog_url = function catalog_url(result) {
  return '/' + result.catalog;
};

helpers.asset_url = function asset_url(result) {
  return '/' + result.catalog + '/' + result.id;
};

helpers.thumbnail_url = function thumbnail_url(result) {
  return '/' + result.catalog + '/' + result.id + '/thumbnail';
};

helpers.find_catalog = function find_catalog(req, alias) {
  var catalog = cip.find_catalog(req.app.get('cip_catalogs'), alias);
  if(!catalog) {
      return null;
  }
  return catalog.name;
};

function search(es_client, params, freetext, offset, callback) {
  var query = {
    index: 'assets',
    size: page_size,
    from: offset,
    body: {}
  };


  query.body = {
      sort: [
          {'modification_time': 'desc'}
      ],
      filter: {
          and: []
      }
  };

  if(Object.keys(params).length > 0) {
      query.body.filter.and.push(
          {
              query: { match: params }
          }
      );
  }

  if(freetext !== undefined && freetext.length > 0) {
      query.body.filter.and.push(
          {
              query: {
                  query_string: {
                      query: "_all:\"" + freetext + "\""
                  }
              }
          }
      );
  }

  if(query.body.filter.and.length === 0) {
      delete query.body.filter.and;
  }

  es_client.search(query).then(function (resp) {
    var results = [];
    var temp_results = resp.hits.hits;
    var total_results = resp.hits.total;

    for(var i=0; i < temp_results.length; ++i) {
        results.push(temp_results[i]._source);
    }
    callback(results, offset, total_results);
  });
}

exports.index = function index(req, res) {
    var freetext = req.param('q');
    var category = req.param('category');
    var offset = req.param('offset');
    var es_client = req.app.get('es_client');
    var query_params = {};

    if(req.params.catalog != undefined) {
        query_params['catalog'] = req.params.catalog;
    }

    if(category != undefined && category) {
        query_params['categories_int'] = category;
    }

    search(
        es_client,
        query_params,
        freetext,
        offset,
        function(results, offset, total_results) {
            var final_results = {
                offset: offset,
                total_results: total_results,
                results: []
            };

            var real_results = [];
            for(var i=0; i < results.length; ++i) {
                real_results.push({
                    title: results[i].short_title,
                    url: helpers.asset_url(results[i]),
                    thumbnail_url: helpers.thumbnail_url(results[i]),
                    catalog_url: helpers.catalog_url(results[i]),
                    description: results[i].description,
                    catalog: (helpers.find_catalog(req, results[i].catalog) || '')
                });
            }

            final_results.results = real_results;

            res.header('Content-type', 'application/json; charset=utf-8');
            res.json(final_results);

        }
    );
}

// exports.catalogs = function catalogs(req, res) {
//     var catalogs = req.app.get('cip_catalogs');
//     var results = [];

//     catalogs = catalogs.sort(function(x,y) { return x.name.localeCompare(y.name); });

//     for(var i=0; i < catalogs.length; ++i) {
//         if(catalogs[i].alias == undefined)
//             continue;

//         results.push({
//             name: catalogs[i].name,
//             alias: catalogs[i].alias
//         });
//     }

//     res.header('Content-type', 'application/json; charset=utf-8');
//     res.json(results);
// };
// This is no longer used

exports.categories = function categories(req, res) {
    var catalog = req.params.catalog;
    var categories = req.app.get('cip_categories');

    res.header('Content-type', 'application/json; charset=utf-8');
    res.json(categories[catalog].tree);
};

exports.suggest = function suggest(req, res) {
    var es_client = req.app.get('es_client');
    var text = req.param('text');
    var query = {
      "body": {
        "suggest" : {
            "text" : text,
            "term" : {
                "field" : "description",
                "suggest_mode": "always"
            }
        }
      }
    };

    es_client.suggest(query).then(function (resp) {
        var results = [];
        var temp_results = resp.suggest;
        res.header('Content-type', 'application/json; charset=utf-8');
        res.json(resp.suggest[0].options);
    });
};
