var querystring = require('querystring');

module.exports = function() {
  var urlParams = window.location.search.substring(1);
  var parameters = querystring.parse(urlParams);

  // Extract the sorting query parameter
  var sort = parameters.sort;
  delete parameters.sort;

  var filters = {};

  // Rename the q parameter to freetext, split by space
  if(parameters.q) {
    var freetext = parameters.q;
    delete parameters.q;
    filters.freetext = freetext.split(' ');
  }

  // The rest are filters
  Object.keys(parameters).forEach(function(field) {
    filters[field] = parameters[field].split(',');
  });

  return {
    filters: filters,
    sort: sort
  };
};
