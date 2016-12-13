'use strict';

var querystring = require('querystring');
var config = require('../config');

/**
 * Get a response that bootstraps the clientside rendering of search results
 */
exports.clientSideResult = function(req, res) {
  res.render('search', {
    req,
    isSearching: true,
    filters: {
      q: req.params.q || ''
    },
    result: {
      isSearch: true
    }
  });
};

exports.redirect = function(req, res, next) {
  var doRedirect = false;

  // Replace a path param on catalog, with a query param
  if(req.params.catalog && req.params.catalog !== config.search.path) {
    req.query.catalog = req.params.catalog;
    delete req.params.catalog;
    doRedirect = true;
  }
  // If the query parameter 'q' is set and the user is requesting the frontpage
  if((req.query.q || req.query.q === '') && req.path === '/') {
    doRedirect = true;
  }
  // Redirect to the new search page.
  if(doRedirect) {
    var qs = querystring.stringify(req.query);
    res.redirect('/' + config.search.path + '?' + qs);
  } else {
    next();
  }
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
