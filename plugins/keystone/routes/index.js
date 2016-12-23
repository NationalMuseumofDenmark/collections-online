'use strict';

var keystone = require('keystone');
var middleware = require('./middleware');
var importRoutes = keystone.importer(__dirname);

// Common Middleware
keystone.pre('routes', middleware.initLocals);
// Override error handlers
keystone.set('404', middleware.error404);
keystone.set('500', middleware.error500);

// Import Route Controllers
var routes = {
  views: importRoutes('./views')
};

// Setup Route Bindings
module.exports = (app) => {
  // Views
  app.get('/:slug', routes.views.page);
};
