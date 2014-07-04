'use strict';

// Imported from json.js
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
// Import ends

// Front page
exports.index = function index(req, res) {
    var es_client = req.app.get('es_client');
    var freetext = req.param('q');

    // Get the intial assets
    search(es_client, {}, freetext, 0,
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

      res.render('search', {
          req: req,
          infinitepath: freetext != undefined ? 'infinite/null/' + '2?q=' + freetext : 'infinite/null/' + '2', // Append query terms if present
          results: final_results.results
      });
    }
  );
};

// Catalog page
exports.catalog = function catalog(req, res) {
  var es_client = req.app.get('es_client');
  var query_params = {};

  if(req.params.catalog != undefined) {
    query_params['catalog'] = req.params.catalog; // Grab the current catalog
  }

    // Get the intial assets
  search(es_client, query_params, '', 0,
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

      res.render('search', {
        req: req,
        infinitepath: 'infinite/' + req.param('catalog') + '/2',
        results: final_results.results
      });
    }
  );
};

// Infinite scroll for both catalog pages, front page and search pages
exports.infinite = function(req, res) {
  var freetext = req.param('q');
  var category = req.param('category');
  var offset = req.params.id * page_size; // Offset by page size
  var es_client = req.app.get('es_client');
  var query_params = {};

  if(req.params.catalog != undefined && req.params.catalog != 'null') {
    query_params['catalog'] = req.params.catalog;
  }

  if(category != undefined && category) {
    query_params['categories_int'] = category;
  }

  search(es_client,query_params, freetext, offset,
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

      res.render('components/infinite-search', {
        req: req,
        infinitepath: 'infinite/' + req.param('catalog') + '/2',
        results: final_results.results
      });
    }
  );
};