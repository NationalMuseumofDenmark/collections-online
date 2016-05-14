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
var fs = require('fs');
var cors = require('cors');
var config = require('./config');
var jade = require('jade');

/**
 * Express configuration
 */
module.exports = function(app) {
  var env = app.get('env');
  app.set('case sensitive routing', true);
  app.use(compression());
  app.use(cors());

  var viewsPaths = config.appPaths.map((p) => {
    return path.normalize(path.join(p, 'views'));
  });

  if ('development' === env) {
    app.use(require('connect-livereload')());
    config.appPaths.forEach((appPath) => {
      app.use(serveStatic(appPath));
    });
  }

  if ('production' === env || 'test' === env) {
    // TODO: Consider implementing the use of serve-favicon again.
    // app.use(favicon(path.join(config.root, 'public', 'favicon.ico')));
    config.appPaths.forEach((appPath) => {
      app.use(serveStatic(appPath), {
        maxAge: '30d'
      });
    });
  }

  var Parser = require('jade').Parser;
  Parser.prototype.orginalResolvePath = Parser.prototype.resolvePath;
  Parser.prototype.resolvePath = function (pathToResolve, purpose) {
    // Figure out what the filepath of the current file is
    var filepath = path.dirname(this.filename);
    // What is this path, relative to the relevant views directory path?
    var relativeFilepath = viewsPaths.reduce((result, viewPath) => {
      if(filepath.indexOf(viewPath) === 0) {
        return filepath.substring(viewPath.length);
      } else {
        return result;
      }
    }, false);
    if(relativeFilepath === false) {
      throw new Error('Could not determine the relative filepath');
    }

    var candidatePaths = viewsPaths.map((viewPath) => {
      var candidatePath = path.join(viewPath, relativeFilepath, pathToResolve);
      if (path.basename(candidatePath).indexOf('.') === -1) {
        candidatePath += '.jade';
      }
      return candidatePath;
    });

    var resolvedPath = candidatePaths.reduce((result, candidatePath) => {
      if(!result) {
        try {
          if (fs.statSync(candidatePath)) {
            return candidatePath;
          }
        } catch(e) {
          // We expect that this might fail - if the file does not exist.
        }
      } else {
        return result;
      }
    }, false);

    if (resolvedPath === false) {
      throw new Error('Failed "' + purpose + '" of "' + pathToResolve + '"');
    } else {
      return resolvedPath;
    }
  };
  app.set('views', viewsPaths);
  app.set('view engine', 'jade');
  app.engine('.jade', jade.__express);

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
