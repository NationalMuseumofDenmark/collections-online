'use strict';

var request = require('request');
var querystring = require('querystring');
var config = require('../config');

const allIndecies = Object.keys(config.types).map((type) => {
  return config.types[type].index;
});

function validateRequest(req) {
  if (req.method === 'GET' || req.method === 'POST') {
    if(req.pathParts.length > 0) {
      var lastPart = req.pathParts[req.pathParts.length-1];
      if(lastPart === '_search') {
        if(req.query.size > 100) {
          throw new Error('A size of 100 or less is required');
        }
      } else if(lastPart === '_mapping') {
        return true;
      } else {
        throw new Error('"' + lastPart + '" is not allowed at the moment');
      }
    }
  } else {
    throw new Error('Only GET and POST requests are allowed at the moment');
  }
}

exports.proxy = function(req, res, next) {
  // Removing the first /api/ from the requested URL and splitting it by '/'
  var pathParts = req.path.replace(/^\/api\//, '').split('/');
  // Create an object for the proxy request.
  var proxyReq = {
    method: req.method,
    pathParts: pathParts,
    query: req.query,
    body: req.body
  };

  // Throws exceptions
  validateRequest(proxyReq);

  // We provide some handy aliasses for developers to access all relevant
  // indecies at once - the _all would return too many results

  if(proxyReq.pathParts.length >= 1 && proxyReq.pathParts[0] === 'all') {
    proxyReq.pathParts[0] = allIndecies.join(',');
  }
  // Prepending the actual protocol-scheme and hostname.
  var qs = proxyReq.query ?
           '?' + querystring.stringify(proxyReq.query)
           : '';
  // Generate a URL
  proxyReq.url = 'http://' +
                 config.es.host +
                 '/' + proxyReq.pathParts.join('/') +
                 qs;
  // And then send it
  request({
    method: proxyReq.method,
    url: proxyReq.url,
    json: proxyReq.body
  }).pipe(res);
};
