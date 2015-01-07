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

helpers.thousandsSeparator = function thousandsSeparator(number) {
  return number.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1.");
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
          and: [],
      }
  };

  /* // this is expressed in the is_searchable field.
  query.body.filter.and.push({
      or: [{query: { match: {"review_state.id":  3}}},
           {query: { match: {"review_state.id":  4}}}]
  });
  */

  // Add catalog query parameter
  if (params.hasOwnProperty('catalog')) {
    query.body.filter.and.push({
      query: {match: {"catalog":params.catalog}}
    });
  }

  // Add category query parameter
  if (params.hasOwnProperty('categories_int')) {
    query.body.filter.and.push({
      query: {match: {"categories_int":params.categories_int} }
    });
  }

  // Make sure all results are reachable through a search.
  query.body.filter.and.push({
    query: { match: {"is_searchable": true} }
  });

  if(freetext !== undefined && freetext.length > 0) {
    freetext = freetext.replace('-', ' ');
    var freetext_arr = freetext.trim().split(/ +/);

    for(var i=0; i < freetext_arr.length; i++) {
        freetext_arr[i] = '"' + freetext_arr[i] + '"';
    }

    query.body.filter.and.push({
        query: {
            query_string: {
                query: "_all:" + freetext_arr.join(' AND ')
            }
        }
    });
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
          total_results_raw: total_results,
          total_results: helpers.thousandsSeparator(total_results),
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

      // Heading for either front page or search page
      if (freetext !== undefined) {
        final_results.is_search = true;
      } else {
        final_results.is_front = true;
      }

      res.render('search', {
          req: req,
          infinitepath: freetext !== undefined ? 'null/infinite/?p=2&q=' + querystring.escape(freetext) : 'null/infinite?p=2', // Append query terms if present
          results: final_results,
          freetext: freetext
      });
    }
  );
};

// Catalog page
exports.catalog = function catalog(req, res) {
  var category = req.param('cat');
  var es_client = req.app.get('es_client');
  var offset = 0;
  var query_params = {};

  if(req.params.catalog !== undefined) {
    query_params.catalog = req.params.catalog; // Grab the current catalog
  }

  if(category !== undefined && category) {
    query_params.categories_int = category;
  }

  // Get the intial assets
  search(es_client, query_params, '', offset,
    function(results, offset, total_results) {
      var final_results = {
        offset: offset,
        total_results_raw: total_results,
        total_results: helpers.thousandsSeparator(total_results),
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

      // Heading for either catalog, cat page - first grab some meta data
      var catalogs = req.app.get('cip_catalogs');
      var categories = req.app.get('cip_categories');
      var metadata = [];

      for(i=0; i < catalogs.length; ++i) {
          if(catalogs[i].alias === undefined || catalogs[i].alias !== req.params.catalog)
              continue;

          var children = categories[catalogs[i].alias].tree;

          metadata.push({
              name: catalogs[i].name,
              alias: catalogs[i].alias,
              children: children
          });
      }

      if(metadata.length === 0) {
          res.status(404);
          res.render('404.jade', {'req': req});
          return;
      }

      metadata = metadata[0];

      if (req.params.catalog !== undefined && category !== undefined && category) {
        // Retrieve the breadcrumbs
        var path = categories[req.params.catalog].get_path(parseInt(category));
        metadata.breadcrumbs = {
          first: path.length > 1 ? path[1] : null,
          second: path.length > 2 ? path[2] : null
        };

        final_results.is_category = true;
      } else {
        final_results.is_catalog = true;
      }

      res.render('search', {
        req: req,
        infinitepath: req.param('catalog') + '/infinite?p=2&cat=' + category,
        results: final_results,
        metadata: metadata
      });
    }
  );
};

// Infinite scroll for both catalog pages, front page and search pages
exports.infinite = function(req, res) {
  var freetext = req.param('q');
  var offset = (req.param('p') - 1 ) * page_size; // Offset by page size
  var category = req.param('cat');
  var es_client = req.app.get('es_client');
  var query_params = {};

  if(req.params.catalog !== undefined && req.params.catalog !== 'null') {
    query_params.catalog = req.params.catalog;
  }

  if(category !== undefined && category !== 'undefined' && category) {
    query_params.categories_int = category;
  }

  search(es_client,query_params, freetext, offset,
    function(results, offset, total_results) {
        var final_results = {
          offset: offset,
          total_results: total_results,
          total_results_raw: total_results,
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

      res.render('infinite-search', {
        req: req,
        infinitepath: req.param('catalog') + 'infinite?p=2',
        results: final_results.results
      });
    }
  );
};

// Retrieve the main menu async & render server side
exports.mainmenu = function(req, res) {
  // Grab categories, i.e. second level in the menu
  var categories = req.app.get('cip_categories');

  // Grab the catalogs, i.e. first level in the menu
  var catalogs = req.app.get('cip_catalogs');
  var results = [];

  catalogs = catalogs.sort(function(x,y) { return x.name.localeCompare(y.name); });

  for(var i=0; i < catalogs.length; ++i) {
      if(catalogs[i].alias === undefined)
          continue;

      var children = categories[catalogs[i].alias].tree;

      results.push({
          name: catalogs[i].name,
          alias: catalogs[i].alias,
          children: children
      });
  }
  // res.json(results);
  res.render('main-menu', {
    results: results
  });
};
