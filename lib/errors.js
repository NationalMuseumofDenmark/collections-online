'use strict';

var config = require('./config');

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

    if (req.accepts('json')) {
      res.json({
        message: err.message || 'An error occurred'
      });
    } else {
      res.render('error.pug', {
        'req': req,
        'err': err,
        'showStacktrace': config.env === 'test' || config.env === 'development'
      });
    }
  });
};
