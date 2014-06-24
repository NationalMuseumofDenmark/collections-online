'use strict';

var asset = require('./controllers/asset.js');
var middleware = require('./middleware');
var search = require('./controllers/search.js');

/**
 * Application routes
 */
module.exports = function(app) {
    app.route('/suggest').get(search.suggest);
    app.route('/search.json').get(search.index_json);
    app.route('/:catalog').get(search.catalog);
    app.route('/:catalog/search.json').get(search.catalog_json);
    app.route('/:catalog/:id/image/:size').get(asset.image);
    app.route('/:catalog/:id/thumbnail').get(asset.thumbnail);
    app.route('/:catalog/:id').get(asset.index);
    app.route('/').get(search.index);

};
