'use strict';

const search = require('./controllers/search');
const api = require('./controllers/api');
const json = require('./controllers/json');
const sitemap = require('./controllers/sitemap');
const robots = require('./controllers/robots');
const motifTagging = require('./controllers/motif-tagging');
const index = require('./controllers/index');
const doc = require('./controllers/document');
const config = require('./config');

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
  app.route('/').get(search.redirect).get(index.frontpage);

  // Search results
  app.route('/' + encodeURIComponent(config.search.path))
    .get(search.clientSideResult);

  app.route('/:catalog/sitemap.xml').get(sitemap.catalog);

  // Register a router for every type
  const types = Object.keys(config.types);
  types.forEach((type) => {
    // Register all routes related to the particular type
    const router = require(config.types[type].router);
    // Register the types router on the app
    let path;
    if(types.length > 1) {
      path = '/:collection([a-zA-Z\-]+)/' + type + '/:id(\\d+)';
    } else {
      path = '/:collection([a-zA-Z\-]+)/:id(\\d+)';
    }
    app.use(path, router);
    // Allowing a /json call that returns raw json
    app.get(path + '/json', (req, res, next) => {
      return doc.json(req, type).then((response) => {
        res.json(response);
      }, next);
    });
  });
};
