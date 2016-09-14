var querystring = require('querystring');

module.exports = function(searchParameters) {
  var parameters = searchParameters.filters || {};

  // Rename freetext to q when represented in the URL
  if (parameters.freetext) {
    parameters.q = parameters.freetext.join(' ');
    delete parameters.freetext;
  }

  if (searchParameters.sort) {
    parameters.sort = searchParameters.sort;
  }

  Object.keys(parameters).forEach(function(field) {
    var value = parameters[field];
    if(typeof(value) === 'object' && value.length > 0) {
      parameters[field] = value.join(',');
    } else if(typeof(value) === 'string' && value != '') {
      // Don't do anything
    } else {
      delete parameters[field];
    }
  });
  var result = querystring.stringify(parameters);
  result = result.replace(/%20/g,'+').replace(/%2C/g,',');
  return result ? '?' + result : '';
};
