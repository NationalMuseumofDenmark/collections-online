'use strict';

var request = require('request');
var config = require('../config');

function reqIsAllowed(req) {
  if (req.method === 'GET' || req.method === 'POST') {
    var parts = req.path.split('?');
    var pathSegments = parts[0].split('/');
    if(pathSegments.length > 0) {
      var lastSegment = pathSegments[pathSegments.length-1];
      if(lastSegment === '_search' || lastSegment === '_mapping') {
        return true;
      }
    }
  }
  // Assume that all but the above exceptions are not allowed.
  return false;
}

exports.proxy = function(req, res, next) {
  // Remove the /es/ from the requested URL.
  var path = req.url.substring(4);
  // Create an object for the proxy request.
  var proxyReq = {
    method: req.method,
    path: path
  };
  // Check if the proxy request is allowed.
  if (reqIsAllowed(proxyReq)) {
    // We provide some handy aliasses for developers to access all relevant
    // indecies at once - the _all would return too many results

    var pathSegments = proxyReq.path.split('/');
    if(pathSegments.length >= 2 && pathSegments[1] === 'all') {
      var allIndecies = config.es.allIndecies || ['_all'];
      pathSegments[1] = allIndecies.join(',');
    }
    // Prepending the actual protocol-scheme and hostname.
    // proxyReq.path starts with a slash,
    // so pathSegments's first element is an empty string
    proxyReq.url = 'http://' + config.es.host + pathSegments.join('/');
    console.log('proxyReq.url = ', proxyReq.url);
    // Reset the unused field.
    proxyReq.path = undefined;
    // Send along any body to elasticsearch
    if(req.method === 'POST') {
      // Request and pipe it through.
      request.post(proxyReq.url, {json: req.body}).pipe(res);
    } else if(req.method === 'GET') {
      request(proxyReq).pipe(res);
    } else {
      throw new Error('Unsupported HTTP method!');
    }
  } else {
    next(new Error('The request is not allowed - please contact us if you ' +
      'would like the ability to issue such requests.'));
  }
};
