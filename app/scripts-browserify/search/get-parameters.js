/**
 * This module generates search parameters that will lead to a specific
 * filtering and sorting being activated, based on the querystring.
 * This is the inverse of generate-querystring.
 */

var querystring = require('querystring');
const DEFAULT_SORTING = require('./default-sorting');

module.exports = function() {
  var urlParams = window.location.search.substring(1);
  var parameters = querystring.parse(urlParams);

  // Extract the sorting query parameter
  var sorting = parameters.sort || DEFAULT_SORTING;
  delete parameters.sort;

  var filters = {};

  // Let's not split the querystring on comma
  if(parameters.q) {
    filters.queryString = [parameters.q];
  }
  delete parameters.q;

  // The rest are filters
  Object.keys(parameters).forEach(function(field) {
    filters[field] = parameters[field].split(',');
  });

  return {
    filters: filters,
    sorting: sorting
  };
};
