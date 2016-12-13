'use strict';

var search = require('./controllers/search');
var api = require('./controllers/api');
var json = require('./controllers/json');
var sitemap = require('./controllers/sitemap');
var robots = require('./controllers/robots');
var motifTagging = require('./controllers/motif-tagging');
var index = require('./controllers/index');
var config = require('./config');

/**
 * Application routes
 */
module.exports = function(app) {
  // Static urls
  app.route('/suggest.json').get(json.suggest);
  app.route('/robots.txt').get(robots.robotsTxt);
  app.route('/sitemap.xml').get(sitemap.index);

  // Get the catalogs for the main menu
  app.route('/catalogs').get(search.mainmenu);
  app.route('/motif-tag-suggestions').get(motifTagging.typeaheadSuggestions);

  // A safe proxy for the elastic search index.
  app.get('/api', api.index);
  app.route('/api/*').get(api.proxy).post(api.proxy);

  // Do pretty redirects, to aviod breaking old links to the site
  app.route('/').get(search.redirect);
  app.route('/:catalog').get(search.redirect);

  // Search results
  app.route('/').get(index.frontpage);

  app.route('/' + encodeURIComponent(config.search.path))
    .get(search.clientSideResult);

  app.route('/:catalog/sitemap.xml').get(sitemap.catalog);

  // Register a router for every type
  const types = Object.keys(config.types);
  types.forEach((type) => {
    // Register all routes related to the particular type
    var router = require(config.types[type].router);
    // Register the types router on the app
    if(types.length > 1) {
      app.use('/:collection([a-zA-Z\-]+)/' + type + '/:id(\\d+)', router);
    } else {
      app.use('/:collection([a-zA-Z\-]+)/:id(\\d+)', router);
    }
  });
};
