'use strict';

var Q = require('q');
var plugins = require('./plugins');

exports.config = (config) => {
  if(!config) {
    throw new Error('Needed a config object when initializing');
  }
  require('./lib/config').set(config);
};

exports.initialize = (app, pluginPackages) => {
  if(!app) {
    throw new Error('Needed an Express app when initializing');
  }

  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  var config = require('./lib/config');

  // After all plugins have initialized, the main server should start
  return plugins.initialize(pluginPackages, app, config).then(() => {
    var es = require('./lib/services/elasticsearch');

    require('./lib/express')(app);

    app.locals.config = config;
    app.locals.helpers = require('./lib/helpers');

    app.set('siteTitle', config.siteTitle);
    // Trust the X-Forwarded-* headers from the Nginx reverse proxy infront of
    // the app (See http://expressjs.com/api.html#app.set)
    app.set('trust proxy', 'loopback');

    return es.count({
      index: config.es.assetsIndex
    }).then(function(response) {
      console.log('Connecting to the Elasticsearch host', config.es.host);
      console.log('The assets index is created and contains',
                  response.count, 'documents.');
    }, function(err) {
      if(err.status === 404) {
        console.error('Missing Elasticsearch index:', config.es.assetsIndex);
      } else {
        console.error('Could not connect to the Elasticsearch:',
                      'Is the elasticsearch service started?');
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
  require('./lib/routes')(app);
};

exports.registerErrors = (app) => {
  require('./lib/errors')(app);
};
