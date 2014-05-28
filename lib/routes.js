'use strict';

var asset = require('./controllers/asset.js');
var middleware = require('./middleware');
var search = require('./controllers/search.js');

/**
 * Application routes
 */
module.exports = function(app) {
    app.route('/:catalog/:id/image/:size').get(asset.image);
    app.route('/:catalog/:id/thumbnail').get(asset.thumbnail);
    app.route('/:catalog/:id').get(asset.index);
    app.route('/:catalog').get(search.catalog);
};
