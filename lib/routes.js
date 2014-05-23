'use strict';

var asset = require('./controllers/asset.js'),
    middleware = require('./middleware');

/**
 * Application routes
 */
module.exports = function(app) {
    app.route('/:catalog/:id/image/:size').get(asset.image);
    app.route('/:catalog/:id').get(asset.index);
};
