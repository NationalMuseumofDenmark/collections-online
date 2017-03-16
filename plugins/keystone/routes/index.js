'use strict';

var keystone = require('keystone');
var importRoutes = keystone.importer(__dirname);

// Import Route Controllers
var routes = {
  views: importRoutes('./views')
};

// Setup Route Bindings
module.exports = (app) => {
  // Views
  app.get('/:slug', routes.views.page);
};
