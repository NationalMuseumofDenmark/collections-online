'use strict';

var querystring = require('querystring'),
    cip = require('../services/natmus-cip'),
    es = require('../services/elasticsearch'),
    config = require('../config/config'),
    assetPlayer = require('../asset-player');

var helpers = {};

const PAGE_SIZE = 10;

helpers.catalogURL = function(result) {
  return '/' + result.catalog;
};

helpers.assetURL = function(result) {
  return '/' + result.catalog + '/' + result.id;
};

helpers.thumbnailURL = function(result) {
  return '/' + result.catalog + '/' + result.id + '/thumbnail';
};

helpers.findCatalog = function(req, alias) {
  var catalog = cip.findCatalog(req.app.get('catalogs'), alias);
  if (!catalog) {
    return null;
  }
  return catalog.name;
};

helpers.thousandsSeparator = function thousandsSeparator(number) {
  return number.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1.');
};

function prepareFilters(req) {
  var freetext = req.query.q || '';
  var params = {};

  if ('geotagged' in req.query) {
    params.geotagged = req.query.geotagged === 'true';
  } else {
    params.geotagged = null;
  }

  if ('catalog' in req.params && req.params.catalog !== 'null') {
    params.catalog = req.params.catalog;
  }

  if ('cat' in req.query && req.query.cat !== '') {
    params.category = parseInt(req.query.cat, 10);
  }

  var offset;
  if ('p' in req.query) {
    var p = parseInt(req.query.p, 10);
    // Offset by page size
    offset = (p - 1) * PAGE_SIZE;
  } else {
    offset = 0;
  }

  return {
    freetext: freetext,
    offset: offset,
    params: params
  };
}

function search(params, freetext, offset) {
  var query = {
    index: config.esAssetsIndex,
    size: PAGE_SIZE,
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

  // Add catalog query parameter
  if ('catalog' in params) {
    query.body.filter.and.push({
      query: {match: {'catalog': params.catalog}}
    });
  }

  // Add category query parameter
  if ('category' in params) {
    query.body.filter.and.push({
      query: {match: {'categories_int': params.category}}
    });
  }

  // Make sure all results are reachable through a search.
  query.body.filter.and.push({
    query: {match: {'is_searchable': true}}
  });

  if ('geotagged' in params && params.geotagged !== null) {
    if (params.geotagged) {
      query.body.filter.and.push({
        or: [
          {exists: {field: 'google_maps_coordinates'}},
          {exists: {field: 'google_maps_coordinates_crowd'}}
        ]
      });
    } else {
      query.body.filter.and.push({
        and: [
          {missing: {field: 'google_maps_coordinates'}},
          {missing: {field: 'google_maps_coordinates_crowd'}}
        ]
      });
    }
  }

  if (freetext !== undefined && freetext.length > 0) {
    freetext = freetext.replace('-', ' ');
    var freetexts = freetext.trim().split(/ +/);

    freetexts.forEach((text) => {
      query.body.filter.and.push({
        'query': {
          'wildcard': {
            '_all': '*' + text + '*'
          }
        }
      });
    });
  }

  if (query.body.filter.and.length === 0) {
    delete query.body.filter.and;
  }

  return es.search(query).then(function (resp) {
    var results = [];
    var temp_results = resp.hits.hits;
    var total_results = resp.hits.total;

    for (var i=0; i < temp_results.length; ++i) {
      results.push(temp_results[i]._source);
    }
    return [results, total_results];
  });
}

exports.result = function index(req, res) {
  // Filter parameters
  var filters = prepareFilters(req);

  // Get the intial assets
  return search(filters.params, filters.freetext, filters.offset)
  .then(function(search_result) {
    var results = search_result[0];
    var total_results = search_result[1];

    var final_results = {
      offset: filters.offset,
      total_results_raw: total_results,
      total_results: helpers.thousandsSeparator(total_results),
      results: []
    };

    var real_results = [];
    for (var i=0; i < results.length; ++i) {
      real_results.push({
        title: results[i].short_title,
        url: helpers.assetURL(results[i]),
        thumbnail_url: helpers.thumbnailURL(results[i]),
        catalog_url: helpers.catalogURL(results[i]),
        description: results[i].description,
        catalog: (helpers.findCatalog(req, results[i].catalog) || ''),
        type: assetPlayer.determinePlayer( results[i] )
      });
    }

    final_results.results = real_results;
    final_results.is_search = true;
    // Heading for either front page or search page
    return final_results;
  }).then(function(results) {
    var qs = {
      p: 2,
      q: filters.freetext
    };
    if (filters.params.geotagged !== null) {
      qs.geotagged = filters.params.geotagged;
    }

    qs = '?'+querystring.stringify(qs);

    res.render('search', {
      req: req,
      infinitepath: 'null/infinite'+qs,
      results: results,
      filters: filters
    });
    res.end();
  });
};

// Catalog page
exports.catalog = function catalog(req, res, next) {
  var query_params = {};

  var filters = prepareFilters(req);

  var categories = req.app.get('categories');
  var catalogs = req.app.get('catalogs');
  var catalog = catalogs.reduce(function(result, c) {
    if (result) {
      return result;
    } else if (c.alias === req.params.catalog) {
      return {
        name: c.name,
        alias: c.alias,
        children: categories[c.alias].tree
      };
    }
  }, undefined);

  if (!catalog) {
    var err = new Error('Catalog does not exist!');
    err.status = 404;
    next(err);
  } else {
    // Get the intial assets
    search(filters.params, filters.freetext, filters.offset)
    .then(function(search_result) {

      var results = search_result[0];
      var total_results = search_result[1];

      var final_results = {
        offset: filters.offset,
        total_results_raw: total_results,
        total_results: helpers.thousandsSeparator(total_results),
        results: []
      };

      var real_results = [];
      for (var i=0; i < results.length; ++i) {
        real_results.push({
          title: results[i].short_title,
          url: helpers.assetURL(results[i]),
          thumbnail_url: helpers.thumbnailURL(results[i]),
          catalog_url: helpers.catalogURL(results[i]),
          description: results[i].description,
          catalog: (helpers.findCatalog(req, results[i].catalog) || ''),
          type: assetPlayer.determinePlayer( results[i] )
        });
      }

      final_results.results = real_results;

      var category = filters.params.category;
      var breadcrumbs;
      if (category) {
        // Retrieve the breadcrumbs
        var path = categories[catalog.alias].getPath(category);
        if (!path) {
          var err = new Error('Category does not exist!');
          err.status = 404;
          next(err);
          return;
        } else {
          breadcrumbs = {
            first:  path.length > 1 ? path[1] : null,
            second: path.length > 2 ? path[2] : null,
            last:   path[path.length - 1]
          };
          final_results.is_category = true;
        }
      } else {
        final_results.is_catalog = true;
      }

      var qs = {
        p: 2,
        q: filters.freetext
      };
      if (filters.params.geotagged !== null) {
        qs.geotagged = filters.params.geotagged;
      }
      if (category) {
        qs.cat = category;
      }

      qs = '?'+querystring.stringify(qs);

      res.render('search', {
        req: req,
        infinitepath: req.params.catalog + '/infinite' + qs,
        results: final_results,
        breadcrumbs: breadcrumbs,
        catalog: catalog,
        filters: filters
      });
    }, next);
  }
};

// Infinite scroll for both catalog pages, front page and search pages
exports.infinite = function(req, res) {
  var filters = prepareFilters(req);

  search(filters.params, filters.freetext, filters.offset)
  .then(function(search_result) {
    var results = search_result[0];
    var total_results = search_result[1];

    var parsedResults = [];
    for (var i=0; i < results.length; ++i) {
        parsedResults.push({
          title: results[i].short_title,
          url: helpers.assetURL(results[i]),
          thumbnail_url: helpers.thumbnailURL(results[i]),
          catalog_url: helpers.catalogURL(results[i]),
          description: results[i].description,
          catalog: (helpers.findCatalog(req, results[i].catalog) || ''),
          type: assetPlayer.determinePlayer( results[i] )
      });
    }

    res.render('infinite-search', {
      req: req,
      results: parsedResults
    });
    }
  );
};

// Retrieve the main menu async & render server side
exports.mainmenu = function(req, res) {
  // Grab categories, i.e. second level in the menu
  var categories = req.app.get('categories');

  // Grab the catalogs, i.e. first level in the menu
  var catalogs = req.app.get('catalogs');
  var catalogsToRender = [];

  catalogs = catalogs.sort(function(x,y) {
    return x.name.localeCompare(y.name);
  });

  for (var c in catalogs) {
    var catalog = catalogs[c];
    if (catalog.alias === undefined) {
      continue;
    }
    // If fetching the catalogs categories failed.
    if (!categories[catalog.alias] || !categories[catalog.alias].tree) {
      continue;
    }

    // The count of assets in a catalog is the sum of assets in it's categories.
    var count = categories[catalog.alias].tree.children.reduce(function(r, c) {
      return r + c.count;
    }, 0);

    catalogsToRender.push({
      name: catalog.name,
      alias: catalog.alias,
      categoryRoot: categories[catalog.alias].tree,
      count: count
    });
  }
  // res.json(results);
  res.render('main-menu', {
    catalogs: catalogsToRender
  });
};
