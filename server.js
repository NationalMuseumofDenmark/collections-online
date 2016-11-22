'use strict';

var Q = require('q');
var plugins = require('./plugins');

exports.config = (config) => {
  if(typeof(config) !== 'object') {
    throw new Error('Needed a config object when initializing');
  }
  require('./lib/config').set(config);
  if(config.types.asset.index) {
    console.warn('The config parameter "es.assetsIndex" is deprecated',
                 'use "types.asset.index" instead.');
  }
};

exports.initialize = (app, pluginPackages) => {
  if(!app) {
    throw new Error('Needed an Express app when initializing');
  }

  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  var config = require('./lib/config');

  // After all plugins have initialized, the main server should start
  return plugins.initialize(pluginPackages, app, config).then(() => {
    // Save the pluginPackages for later use
    app.set('co-plugins', pluginPackages);

    var es = require('./lib/services/elasticsearch');

    require('./lib/express')(app);

    app.locals.config = config;
    app.locals.helpers = require('./lib/helpers');

    // Trust the X-Forwarded-* headers from the Nginx reverse proxy infront of
    // the app (See http://expressjs.com/api.html#app.set)
    app.set('trust proxy', 'loopback');

    return es.count({
      index: config.types.asset.index
    }).then(function(response) {
      console.log('Connecting to the Elasticsearch host', config.es.host);
      console.log('The assets index is created and contains',
                  response.count, 'documents.');
    }, function(err) {
      if(err.status === 404) {
        console.error('Missing Elasticsearch index:', config.types.asset.index);
      } else {
        console.error('Could not connect to the Elasticsearch:',
                      'Is the elasticsearch service started?');
        process.exit(1);
      }
    })
    .then(() => {
      console.log('Starting up the server');
      // Start server
      if(config.port && config.ip) {
        app.listen(config.port, config.ip, function() {
          console.log('Express server listening on %s:%d, in %s mode',
                      config.ip, config.port, app.get('env'));
        });
      } else if(config.socketPath) {
        app.listen(config.socketPath, function() {
          console.log('Express server listening on socket %s, in %s mode',
                      config.socketPath, app.get('env'));
        });
      } else {
        throw new Error('Could not start server, needed "port" and "ip" ' +
                        'or "socketPath" in the configuration.');
      }
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
