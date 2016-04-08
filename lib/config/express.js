'use strict';

var express = require('express');
var favicon = require('serve-favicon');
var morgan = require('morgan');
var compression = require('compression');
var serveStatic = require('serve-static');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var errorHandler = require('errorhandler');
var path = require('path');
var cors = require('cors');
var config = require('./config');

/**
 * Express configuration
 */
module.exports = function(app) {
  var env = app.get('env');
  app.set('case sensitive routing', true);
  app.use(compression());
  app.use(cors());

  if ('development' === env) {
    app.use(require('connect-livereload')());
    app.use(serveStatic(path.join(config.root, '.tmp')));
    app.use(serveStatic(path.join(config.root, 'app')));
    app.set('views', config.root + config.viewsPath);
  }

  if ('production' === env || 'test' === env) {
    app.use(favicon(path.join(config.root, 'public', 'favicon.ico')));
    app.use(serveStatic(path.join(config.root, 'public'), {
      maxAge: '30d'
    }));
    app.set('views', config.root + config.viewsPath);
  }

  app.set('view engine', 'jade');
  app.use(morgan('dev'));
  app.use(bodyParser.urlencoded({
    extended: true
  }));
  app.use(bodyParser.json());
  app.use(methodOverride());
  app.use(cookieParser());

  app.use(function(req, res, next) {
    res.locals.fullPath = req.originalUrl;
    next();
  });

  // Error handler - has to be last
  if ('development' === app.get('env')) {
    app.use(errorHandler());
  }
};
