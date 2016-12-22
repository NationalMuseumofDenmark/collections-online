'use strict';

var Q = require('q');
var plugins = require('./plugins');

exports.config = (childPath) => {
  require('./lib/config').setChildPath(childPath);
};

exports.initialize = (app, pluginPackages) => {
  if(!app) {
    throw new Error('Needed an Express app when initializing');
  }

  // Add the default plugins
  pluginPackages.push(require('./default-plugins'));

  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  var config = require('./lib/config');

  // After all plugins have initialized, the main server should start
  return plugins.initialize(pluginPackages, app, config).then(() => {
    // Save the pluginPackages for later use
    app.set('co-plugins', pluginPackages);

    var ds = require('./lib/services/documents');

    require('./lib/express')(app);

    app.locals.config = config;
    
    const helpers = require('./lib/helpers');
    helpers.checkRequiredHelpers();
    app.locals.helpers = helpers;

    app.set('siteTitle', config.siteTitle);
    // Trust the X-Forwarded-* headers from the Nginx reverse proxy infront of
    // the app (See http://expressjs.com/api.html#app.set)
    app.set('trust proxy', 'loopback');

    const indecies = Object.keys(config.types).map((type) => {
      return config.types[type].index;
    });
    return ds.count({
      index: indecies,
      query: config.search.baseQuery
    }).then(function(response) {
      console.log('The assets index is created and contains',
                  response.count, 'documents.');
    }, function(err) {
      if(err.status === 404) {
        console.error('Missing document index:', indecies.join(' or '));
      } else {
        console.error('Could not connect to the document service', err);
        process.exit(1);
      }
    })
    .then(() => {
      console.log('Starting up the server');
      // Start server
      app.listen(config.port, config.ip, function() {
        console.log('Express server listening on %s:%d, in %s mode',
                    config.ip, config.port, app.get('env'));
      });
    }, (err) => {
      console.error('Error when starting the app: ', err.stack);
      process.exit(2);
    });
  });
};

exports.registerRoutes = (app) => {
  // Register routes for all plugins
  var pluginPackages = app.get('co-plugins') || [];
  // Require routes from each plugin, if they register routes
  pluginPackages.forEach((plugin) => {
    try {
      if(typeof(plugin.registerRoutes) === 'function') {
        plugin.registerRoutes(app);
      }
    } catch (err) {
      console.error('Error registering routes for a plugin: ', err);
    }
  });
  console.log('Setting up routing for the collections-online core');
  // Register the core collections-online routes
  require('./lib/routes')(app);
};

exports.registerErrors = (app) => {
  require('./lib/errors')(app);
};
