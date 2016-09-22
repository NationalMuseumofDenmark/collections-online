'use strict';

var request = require('request');
var querystring = require('querystring');
var config = require('../config');

function reqIsAllowed(req) {
  if (req.method === 'GET' || req.method === 'POST') {
    if(req.pathParts.length > 0) {
      var lastPart = req.pathParts[req.pathParts.length-1];
      if(lastPart === '_search' || lastPart === '_mapping') {
        return true;
      }
    }
  }
  // Assume that all but the above exceptions are not allowed.
  return false;
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
  // Check if the proxy request is allowed.
  if (reqIsAllowed(proxyReq)) {
    // We provide some handy aliasses for developers to access all relevant
    // indecies at once - the _all would return too many results

    if(proxyReq.pathParts.length >= 1 && proxyReq.pathParts[0] === 'all') {
      var allIndecies = config.es.allIndecies || ['_all'];
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
  } else {
    next(new Error('The request is not allowed - please contact us if you ' +
      'would like the ability to issue such requests.'));
  }
};
