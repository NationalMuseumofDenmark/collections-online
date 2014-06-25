'use strict';

var elasticsearch = require('elasticsearch');
var querystring = require('querystring');
var cip = require('../cip-methods.js');
var helpers = {};
var page_size = 10;

function search(es_client, params, freetext, offset, callback) {
  var query = {
    index: 'assets',
    size: page_size,
    from: offset,
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

helpers.typeahead_result = function typeahead_result(val) {
  return '/suggest?text=' + val;
};

helpers.asset_url = function asset_url(result) {
  return '/' + result.catalog + '/' + result.id;
};

helpers.thumbnail_url = function thumbnail_url(result) {
  return '/' + result.catalog + '/' + result.id + '/thumbnail';
};

helpers.query_string = function query_string(params) {
  return querystring.stringify(params);
};

helpers.find_catalog = function find_catalog(req, alias) {
  var catalog = cip.find_catalog(req.app.get('cip_catalogs'), alias);
  if(!catalog) {
      return null;
  }
  return catalog.name;
};

exports.catalog = function catalog(req, res) {
    res.render('search', { req: req });
};

exports.catalog_json = function catalog_json(req, res) {
    var freetext = req.param('q');
    var offset = req.param('offset');

    search(
        req.app.get('es_client'),
        {catalog: req.params.catalog},
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
                    description: results[i].description,
                    colophon: 'Katalog: ' + (helpers.find_catalog(req, results[i].catalog) || '-') +
                        ' / Fil-ID: ' + results[i].filename + ' / Fotograf: ' + results[i].creator
                });
            }

            final_results.results = real_results;

            res.header('Content-type', 'application/json; charset=utf-8');
            res.json(final_results);

        }
    );
}

exports.index = function index(req, res) {
    res.render('search', { req: req });
};

exports.index_json = function index_json(req, res) {
    var freetext = req.param('q');
    var offset = req.param('offset');

    search(
        req.app.get('es_client'),
        {},
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
                    description: results[i].description,
                    colophon: 'Katalog: ' + (helpers.find_catalog(req, results[i].catalog) || '-') +
                        ' / Fil-ID: ' + results[i].filename + ' / Fotograf: ' + results[i].creator
                });
            }

            final_results.results = real_results;

            res.header('Content-type', 'application/json; charset=utf-8');
            res.json(final_results);

        }
    );
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
