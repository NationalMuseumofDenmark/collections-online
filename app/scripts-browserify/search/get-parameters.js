var querystring = require('querystring');
const DEFAULT_SORTING = require('./default-sorting');

module.exports = function() {
  var urlParams = window.location.search.substring(1);
  var parameters = querystring.parse(urlParams);

  // Extract the sorting query parameter
  var sorting = parameters.sort || DEFAULT_SORTING;
  delete parameters.sort;

  var filters = {};

  // Rename the q parameter to freetext, split by space
  if(parameters.q) {
    var freetext = parameters.q;
    filters.freetext = freetext.split(' ');
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
