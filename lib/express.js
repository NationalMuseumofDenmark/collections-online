'use strict';

var express = require('express');
var favicon = require('serve-favicon');
var morgan = require('morgan');
var compression = require('compression');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var errorHandler = require('errorhandler');
var path = require('path');
var fs = require('fs');
var cors = require('cors');
var config = require('./config');
var pug = require('./pug')(config);

/**
 * Express configuration
 */
module.exports = function(app) {
  var env = app.get('env');
  app.set('case sensitive routing', true);
  app.use(compression());
  app.use(cors());

  // TODO: Consider implementing the use of serve-favicon again.
  // app.use(favicon(path.join(config.root, 'public', 'favicon.ico')));
  config.appPaths.forEach((appPath) => {
    app.use(express.static(appPath));
  });

  var viewsPaths = config.appPaths.map((p) => {
    return path.normalize(path.join(p, 'views'));
  });

  app.set('views', viewsPaths);
  app.set('view engine', 'pug');
  app.engine('.pug', pug.__express);

  // TODO: Consider if 'dev' is to verbose
  app.use(morgan('dev'));
  app.use(bodyParser.urlencoded({
    extended: true
  }));
  app.use(bodyParser.json());
  app.use(cookieParser());
  // If the config host is sat and the requested host does not match, redirect
  app.use((req, res, next) => {
    var host = req.get('host');
    if(config.host && config.host !== host) {
      var expectedURL = 'http://' + config.host + req.originalUrl;
      res.redirect(expectedURL);
    } else {
      next();
    }
  });

  app.use(function(req, res, next) {
    res.locals.fullPath = req.originalUrl;
    next();
  });
};
