'use strict';

var elasticsearch = require('elasticsearch');
var helpers = {};

function search(es_client, params, freetext, callback) {
  var query = {
    index: 'assets',
    size: 100,
    body: {}
  };


  query.body = {
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

  if(freetext !== undefined) {
      query.body.filter.and.push(
          {
              query: {
                  query_string: {
                      query: "_all:*" + freetext + "*"
                  }
              }
          }
      );
  }

  if(query.body.filter.and.length == 0) {
      delete query.body.filter.and;
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
    var freetext = req.param('q');
    search(req.app.get('es_client'), {catalog: req.params.catalog}, freetext, function(results) {
        res.render(
            'search',
            {
                results: results,
                helpers: helpers,
                url:req.url,
                freetext:freetext
            }
        );
    });
};

exports.index = function index(req, res) {
    var freetext = req.query.q;
    search(req.app.get('es_client'), {}, freetext, function(results) {
        res.render(
            'search',
            {
                results: results,
                helpers: helpers,
                url:req.url,
                freetext:freetext
            }
        );
    });
};
