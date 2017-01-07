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
      q: req.query.q || ''
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
