'use strict';

var querystring = require('querystring');
var cip = require('../services/cip');
var es = require('../services/elasticsearch');
var config = require('../config');
var assetPlayer = require('../asset-player');
var helpers = require('../helpers');

var _merge = require('lodash/merge');

const PAGE_SIZE = 12;

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

function dateRangeQuery(fromKey, fromDate, toKey, toDate) {
  return {
    'or': [
      {'and': [
          {'exists': {'field': fromKey}},
          {'exists': {'field': toKey}},
          {'range': {[fromKey] : {'lte': toDate}}},
          {'range': {[toKey]   : {'gte': fromDate}}}
      ]},
      {'and': [
          {'missing': {'field': fromKey}},
          {'exists': {'field': toKey}},
          {'range': {[toKey] : {'gte': fromDate, 'lte': toDate}}},
      ]},
      {'and': [
          {'exists': {'field': fromKey}},
          {'missing': {'field': toKey}},
          {'range': {[toKey] : {'gte': fromDate, 'lte': toDate}}},
      ]}
    ]
  };
}

function prepareFilters(req) {
  var freetext = req.query.q || '';
  var filters = {};
  var params = {};


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
    if (filter.option && filter.option.type === 'date-range' && (
      (key + '-to') in req.query ||
      (key + '-from') in req.query
    )) {
      var from = req.query[key + '-from'] || null;
      var to = req.query[key + '-to'] || null;
      var fromLabel = helpers.ensureDMY(from);
      var toLabel = helpers.ensureDMY(to);

      var label = `${fromLabel} - ${toLabel}`;
      if (to === null) {
        label = `Efter ${fromLabel}`;
      } else if (from === null) {
        label = `Før ${toLabel}`;
      }
      filters[key] = {label, from, to};
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

function search(params, freetext, offset, sorting) {
  var query = {
    index: config.esAssetsIndex,
    size: PAGE_SIZE,
    from: offset,
    body: {},
  };

  query.body = {
    filter: {
      and: [],
    }
  };

  // Add the sorting method to the query from the predefined sort options
  var sortMethod = config.sortOptions[sorting];
  if (sortMethod) {
    query.body.sort = sortMethod.method;
  }

  for (var filterKey in params.filters) {
    var option = params.filters[filterKey];
    var optionConfig = config.filterOptions[filterKey];
    if (optionConfig.option && optionConfig.option.type === 'date-range') {
      var creationFromKey = 'creation_time_from.timestamp';
      var creationToKey = 'creation_time_to.timestamp';
      var acceptanceFromKey = 'acceptance_time_from.timestamp';
      var acceptanceToKey = 'acceptance_time_to.timestamp';
      var from = option.from;
      var to = option.to;
      if (from) { from = helpers.ensureYMD(from); }
      if (to) { to = helpers.ensureYMD(to); }

      var method = {
        'or': [
          {
            'and': [
              {'missing': {'field': creationFromKey}},
              {'missing': {'field': creationToKey}},
              dateRangeQuery(acceptanceFromKey, from, acceptanceToKey, to)
            ]
          },
          dateRangeQuery(creationFromKey, from, creationToKey, to)
        ]
      };

      query.body.filter.and.push(method);

    } else {
      var filterMethod = optionConfig.options[option].method;
      if (filterMethod) {
        query.body.filter.and.push(filterMethod);
      }
    }
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

  if (freetext !== undefined && freetext.length > 0) {
    freetext = freetext.replace(/-/g, ' ');
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

function pageUrls(filters, sorting) {
  var args = {q: filters.freetext};
  var nextPageArgs = {};

  if (filters.params.geotagged !== null) {
    args.geotagged = filters.params.geotagged;
  }

  // Don't include the filter with the type catalog
  for (var key in filters.params.filters) {
    var filter = config.filterOptions[key];
    if (filter.option && filter.option.type === 'date-range') {
      var val = filters.params.filters[key];
      args[key +'-from'] = val.from;
      args[key +'-to'] = val.to;
    } else if (filter.type !== 'catalog') {
      args[key] = filters.params.filters[key];
    } else {
      nextPageArgs[key] = filters.params.filters[key];
    }
  }

  if (filters.params.category) {
    args.cat = filters.params.category;
  }

  if (sorting) {
    nextPageArgs.sort = sorting;
  }
  nextPageArgs.p = 2; // next page

  var queryUrl = '?' + querystring.stringify(args);
  var nextPageUrl = '?' + querystring.stringify(_merge(args, nextPageArgs));

  return {
    nextPageUrl,
    queryUrl
  };
}

function transformResponse(req, response) {
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
    totalCountRaw: response.hits.total,
    totalCount: thousandsSeparator(response.hits.total),
    hits: hits
  };
}

exports.result = function(req, res, next) {
  // Filter parameters
  var filters = prepareFilters(req);
  // Check that the catalog alias is in fact a valid catalog
  var catalogAlias = filters.params.filters.catalog;
  if(!catalogAlias || catalogAlias in config.cip.catalogs) {
    var sorting = req.query.sort || 'relevance';

    // Get the intial assets
    return search(filters.params, filters.freetext, filters.offset, sorting)
    .then(function(response) {
      return transformResponse(req, response);

    }).then(function(result) {
      result.offset = filters.offset;
      var urls = pageUrls(filters, sorting);
      result.isSearch = true;

      res.render('search', {
        req,
        infinitepath: 'null/infinite' + urls.nextPageUrl,
        result,
        filters,
        sorting,
        isSearching: true,
        filterOptions: config.filterOptions,
        sortOptions: config.sortOptions,
        queryUrl: urls.queryUrl
      });
      res.end();
    }, next);
  } else {
    var err = new Error('The catalog provided - is not a catalog alias');
    err.status = 404;
    next(err);
  }
};


// Infinite scroll for both catalog pages, front page and search pages
exports.infinite = function(req, res, next) {
  var filters = prepareFilters(req);
  var sorting = req.query.sort || 'relevance';

  search(filters.params, filters.freetext, filters.offset, sorting)
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
