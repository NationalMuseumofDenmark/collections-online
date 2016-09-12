var querystring = require('querystring');

module.exports = function() {
  var urlParams = window.location.search.substring(1);
  return querystring.parse(urlParams);
};
