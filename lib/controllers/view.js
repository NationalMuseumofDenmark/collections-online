'use strict';

var jade = require('../jade');

/**
 * A controller that allows the client side to fetch uncompiled versions of the
 * jade templates, respecting the ability for specialized overloading of these.
 */

exports.get = function(req, res, next) {
  var path = req.params[0] || '';
  var resolvedPath = jade.resolvePath(path);
  if(resolvedPath) {
    res.type('text/plain');
    res.sendFile(resolvedPath);
  } else {
    var e = new Error('Could not find the template: ' + path);
    e.status = 404;
    throw e;
  }
};
