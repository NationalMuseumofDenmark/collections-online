'use strict';

const Q = require('q');
const plugins = require('./plugins');
const config = require('./lib/config');

let co = {
  config: (childPath) => {
    require('./lib/config').setChildPath(childPath);
  },
  registerPlugins: () => {
    // Register the default fallback plugins
    if(config.es) {
      plugins.register(require('./plugins/elasticsearch'));
    }
    if(config.features.keystone) {
      plugins.register(require('./plugins/keystone'));
    }
  },
  initialize: (app) => {
    if(!app) {
      throw new Error('Needed an Express app when initializing');
    }
    // Setting the NODE_ENV environment if it's not already sat
    // TODO: Consider removing this
    process.env.NODE_ENV = process.env.NODE_ENV || 'development';

    // After all plugins have initialized, the main server should start
    return plugins.initialize(app).then(() => {
      require('./lib/express')(app);

      const ds = require('./lib/services/documents');

      app.locals.config = config;
      const helpers = require('./lib/helpers');
      helpers.checkRequiredHelpers();
      app.locals.helpers = helpers;

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
        console.log('The index is created and has', response.count, 'documents.');
      }, function(err) {
        if(err.status === 404) {
          console.error('Missing document index:', indecies.join(' or '));
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
  },
  registerRoutes: (app) => {
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
  },
  registerErrors: (app) => {
    require('./lib/errors')(app);
  }
};

module.exports = co;
