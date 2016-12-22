'use strict';

const config = require('../config');
const querystring = require('querystring');

/**
 * Get a response that bootstraps the clientside rendering of search results
 */
exports.clientSideResult = (req, res) => {
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

exports.redirect = (req, res, next) => {
  console.log('redirect called', req.query.q);
  // If the query parameter 'q' is set and the user is requesting the frontpage
  if(req.path === '/' && typeof(req.query.q) !== 'undefined') {
    var qs = querystring.stringify(req.query);
    res.redirect('/' + config.search.path + '?' + qs);
  } else {
    next();
  }
};

// Retrieve the main menu async & render server side
exports.mainmenu = (req, res) => {
  // Grab categories, i.e. second level in the menu
  var categories = req.app.get('categories');

  // Grab the catalogs, i.e. first level in the menu
  var catalogs = req.app.get('catalogs');
  var catalogsToRender = [];

  if(catalogs) {
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
  }
  // res.json(results);
  res.render('main-menu', {
    catalogs: catalogsToRender
  });
};
