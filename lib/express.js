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
var jade = require('./jade');

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
  app.set('view engine', 'jade');
  app.engine('.jade', jade.__express);

  // TODO: Consider if 'dev' is to verbose
  app.use(morgan('dev'));
  app.use(bodyParser.urlencoded({
    extended: true
  }));
  app.use(bodyParser.json());
  app.use(cookieParser());

  app.use(function(req, res, next) {
    res.locals.fullPath = req.originalUrl;
    next();
  });
};
