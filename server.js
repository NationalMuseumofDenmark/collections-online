'use strict';

var express = require('express');
var cip = require('./lib/services/natmus-cip');
var cipCategories = require('./lib/cip-categories');
var es = require('./lib/services/elasticsearch');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var config = require('./lib/config');
var app = express();
require('./lib/config/express')(app);
app.locals.config = config;

app.locals.helpers = require('./lib/helpers');

app.set('siteTitle', config.siteTitle);
// Trust the X-Forwarded-* headers from the Nginx reverse proxy infront of
// the app (See http://expressjs.com/api.html#app.set)
app.set('trust proxy', 'loopback');

require('./lib/routes')(app);
require('./lib/errors')(app);

es.count({
  index: config.esAssetsIndex
}).then(function(response) {
  console.log('Connecting to the Elasticsearch host', config.esHost);
  console.log('The assets index is created and contains',
              response.count, 'documents.');
  console.log('Loading categories...');
}, function() {
  console.log('Could not connect to the Elasticsearch host', config.esHost);
  // We have an error in the communication with the Elasticsearch server
  // I is probably not started.
  console.error('Is the elasticsearch service started?');
  process.exit(1);
});

var categories = {};

cipCategories.loadCategories().then(function(result) {
  for (var i = 0; i < result.length; ++i) {
    if (result[i] && result[i].id) {
      categories[result[i].id] = result[i];
    } else {
      console.error(result);
      throw new Error('Could not read id from the result of loadCategories');
    }
  }
  // Fetch the number of assets in the category.
  return cipCategories.fetchCategoryCounts(es, categories)
  .then(function(categoriesWithCounts) {
    app.set('categories', categoriesWithCounts);
  });
}).then(function() {
  return cip.getCatalogs().then(function(catalogs) {
    app.set('catalogs', catalogs);
  });
}).then(function() {
  // Start server
  app.listen(config.port, config.ip, function() {
    console.log('Express server listening on %s:%d, in %s mode',
                config.ip, config.port, app.get('env'));
  });
}, function(err) {
  console.error('Error when starting the app: ', err.stack);
});

// Expose app
exports = module.exports = app;
