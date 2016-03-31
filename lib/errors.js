'use strict';

var config = require('./config/config.js');

/**
 * Application errors
 */
module.exports = function(app) {

  app.use(function(req, res, next) {
    var err = new Error('Nothing routes to this URL: ' + req.url);
    err.status = 404;
    next(err);
  });

  app.use(function(err, req, res, next) {  // jshint ignore:line
    res.status(err.status || 500);

    console.error(err.stack);

    var acceptHeader = req.headers.accept || '';
    if (acceptHeader.indexOf('application/json') !== -1) {
      res.json({
        title: 'An error occurred',
        message: err.message,
        error: {}
      });
    } else {
      res.render('error.jade', {
        'req': req,
        'err': err,
        'showStacktrace': config.env === 'test' || config.env === 'development'
      });
    }
  });
};
