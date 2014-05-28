'use strict';

var elasticsearch = require('elasticsearch');
var helpers = {};

function search(es_client, params, callback) {
  var query = {
    index: 'assets',
    size: 100
  };

  if(Object.keys(params).length > 0) {
    query.body = {
      query: {
          match: params
      }
    };
  }
  es_client.search(query).then(function (resp) {
    var results = [];
    var temp_results = resp.hits.hits;

    for(var i=0; i < temp_results.length; ++i) {
        results.push(temp_results[i]._source);
    }
    callback(results);
  });
}

helpers.asset_url = function asset_url(result) {
  return '/' + result.catalog + '/' + result.id;
}

helpers.thumbnail_url = function thumbnail_url(result) {
  return '/' + result.catalog + '/' + result.id + '/thumbnail';
};

exports.catalog = function catalog(req, res) {
    search(req.app.get('es_client'), {catalog: req.params.catalog}, function(results) {
        res.render(
            'search',
            {'results': results, 'helpers': helpers}
        );
    });
};

exports.index = function index(req, res) {
    search(req.app.get('es_client'), {}, function(results) {
        res.render(
            'search',
            {'results': results, 'helpers': helpers}
        );
    });
};
