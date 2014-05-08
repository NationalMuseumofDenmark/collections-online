'use strict';

var asset = require('./controllers/asset.js'),
    middleware = require('./middleware');

/**
 * Application routes
 */
module.exports = function(app) {
  app.route('/assets/:catalog/:id').get(asset.index);
};
