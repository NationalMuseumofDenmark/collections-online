'use strict';

/**
 * The processor handling a query which will return zero, one or more assets
 * to be processed, based on the querystring which is passed to the search.
 */

var cip = require('../../lib/services/cip');
var processResult = require('./result');

module.exports = function(state, query) {
  console.log('Processing query “' + query.query + '” in the',
              query.catalogAlias,
              'catalog');

  var catalog = {alias: query.catalogAlias};

  return cip.criteriaSearch({
    catalog: catalog
  }, query.query, null).then(function(result) {
    result.pageIndex = query.offset || 0;
    // Hang on to the result.
    result.catalog = catalog;
    // Process the next page in the search result.
    return processResult(state, query, result);
  });
};
