'use strict';

var querystring = require('querystring');
var cip = require('../services/natmus-cip');
var es = require('../services/elasticsearch');
var config = require('../config/config');
var assetPlayer = require('../asset-player');
var helpers = require('../helpers');

const PAGE_SIZE = 10;

function catalogURL(result) {
  return '/' + result.catalog;
}

function assetURL(result) {
  return '/' + result.catalog + '/' + result.id;
}

function thumbnailURL(result) {
  return '/' + result.catalog + '/' + result.id + '/thumbnail';
}

function findCatalog(req, alias) {
  var catalog = cip.findCatalog(req.app.get('catalogs'), alias);
  if (!catalog) {
    return null;
  }
  return catalog.name;
}

function thousandsSeparator(number) {
  return number.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1.');
}

function prepareFilters(req) {
  var freetext = req.query.q || '';
  var sorting = req.query.sort || 'relevance';
  var filters = {};
  var params = {};

  params.sorting = sorting;

  if ('geotagged' in req.query) {
    params.geotagged = req.query.geotagged === 'true';
  } else {
    params.geotagged = null;
  }

  if ('catalog' in req.params && req.params.catalog !== 'null') {
    filters['catalog'] = req.params.catalog;
  }

  if ('cat' in req.query && req.query.cat !== '') {
    params.category = parseInt(req.query.cat, 10);
  }

  var filter = null;
  for (var key in config.filterOptions) {
    filter = config.filterOptions[key];
    if (filter.option === 'date-range' && (
      (key + '-to') in req.query ||
      (key + '-from') in req.query
    )) {
      filters[key] = {
        to: req.query[key + '-to'],
        from: req.query[key + '-from']
      };
    } else if (key in req.query) {
      filters[key] = req.query[key];
    }
  }


  var offset;
  if ('p' in req.query) {
    var p = parseInt(req.query.p, 10);
    // Offset by page size
    offset = (p - 1) * PAGE_SIZE;
  } else {
    offset = 0;
  }

  params.filters = filters;


  return {
    freetext,
    offset,
    params
  };
}

function search(params, freetext, offset) {
  var query = {
    index: config.esAssetsIndex,
    size: PAGE_SIZE,
    from: offset,
    body: {},
  };

  query.body = {
    sort: [],
    filter: {
      and: [],
    }
  };

  // Add the sorting method to the query from the predefined sort options
  var sortMethod = config.sortOptions[params.sorting];
  if (sortMethod) {
    query.body.sort.push(sortMethod.method);
  }

  for (var filterKey in params.filters) {
    var option = params.filters[filterKey];
    var filterMethod = config.filterOptions[filterKey].options[option].method;
    if (filterMethod) {
      query.body.filter.and.push(filterMethod);
    }
  }// config.filterOptions

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

  if (freetext !== undefined && freetext.length > 0) {
    freetext = freetext.replace('-', ' ');
    var freetexts = freetext.trim().split(/ +/);

    freetexts.forEach((text) => {
      query.body.filter.and.push({
        'query': {
          'wildcard': {
            '_all': '*' + text.toLowerCase() + '*'
          }
        }
      });
    });
  }

  if (query.body.filter.and.length === 0) {
    delete query.body.filter.and;
  }

  return es.search(query);
}

function pageUrls(filters, category) {
  var args = {
    q: filters.freetext
  };

  if (filters.params.geotagged !== null) {
    args.geotagged = filters.params.geotagged;
  }

  if (category) {
    args.cat = category;
  }

  // Don't include the filter with the type catalog
  for (var key in filters.params.filters) {
    if (config.filterOptions[key].type !== 'catalog') {
      args[key] = filters.params.filters[key];
    }
  }

  var queryUrl = '?' + querystring.stringify(args);

  if (filters.params.sorting) {
    args.sort = filters.params.sorting;
  }
  args.p = 2; // next page

  var nextPageUrl = '?' + querystring.stringify(args);

  return {
    nextPageUrl,
    queryUrl
  };
}

function transformResponse(req, filters, response) {
  var hits = response.hits.hits.map((hit) => {
    var asset = hit._source;
    return {
      title: asset.short_title,
      link: assetURL(asset),
      thumbnailURL: thumbnailURL(asset),
      catalogURL: catalogURL(asset),
      description: asset.description,
      catalog: findCatalog(req, asset.catalog) || '',
      type: assetPlayer.determinePlayer(asset)
    };
  });

  return {
    offset: filters.offset,
    totalCountRaw: response.hits.total,
    totalCount: thousandsSeparator(response.hits.total),
    hits: hits
  };
}

exports.result = function(req, res, next) {
  // Filter parameters
  var filters = prepareFilters(req);

  // Get the intial assets
  return search(filters.params, filters.freetext, filters.offset)
  .then(function(response) {
    return transformResponse(req, filters, response);
  })
  .then(function(result) {
    var urls = pageUrls(filters);
    result.isSearch = true;

    res.render('search', {
      req,
      infinitepath: 'null/infinite' + urls.nextPageUrl,
      result,
      filters,
      filterOptions: config.filterOptions,
      sortOptions: config.sortOptions,
      queryUrl: urls.queryUrl
    });
    res.end();
  }, next);
};


// Infinite scroll for both catalog pages, front page and search pages
exports.infinite = function(req, res, next) {
  var filters = prepareFilters(req);

  search(filters.params, filters.freetext, filters.offset)
  .then(function(response) {
    return transformResponse(req, filters, response);
  })
  .then(function(result) {
    res.render('infinite-search', {
      req,
      result
    });
  }, next);
};

// Retrieve the main menu async & render server side
exports.mainmenu = function(req, res) {
  // Grab categories, i.e. second level in the menu
  var categories = req.app.get('categories');

  // Grab the catalogs, i.e. first level in the menu
  var catalogs = req.app.get('catalogs');
  var catalogsToRender = [];

  catalogs = catalogs.sort(function(x, y) {
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
