var querystring = require('querystring');

module.exports = function() {
  var urlParams = window.location.search.substring(1);
  var result = querystring.parse(urlParams);

  // Extract the freetext query parameter
  var q = result.q;
  delete result.q;

  // Extract the sorting query parameter
  var sort = result.sort;
  delete result.sort;

  // The rest are filters
  var filters = {};
  Object.keys(result).forEach(function(field) {
    var values = result[field];
    filters[field] = values.split(',');
  });

  return {
    q: q,
    filters: filters,
    sort: sort
  };
};
