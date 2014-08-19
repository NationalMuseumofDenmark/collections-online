'use strict';

var asset = require('./controllers/asset.js');
var middleware = require('./middleware');
var search = require('./controllers/search.js');
var json = require('./controllers/json.js');
var xml = require('./controllers/xml.js');

/**
 * Application routes
 */
module.exports = function(app) {
    // Json stuff
    app.route('/suggest.json').get(json.suggest);

    // Page templates
    app.route('/').get(search.index);
    app.route('/catalogs').get(search.mainmenu); // Get the catalogs for the main menu

    // XML stuff
    app.route('/:catalog/sitemap.xml').get(xml.sitemap);

    // Image handling
    app.route('/:catalog/:id/download/:size/:filename').get(asset.download_image);
    app.route('/:catalog/:id/download/:filename').get(asset.download);
    app.route('/:catalog/:id/image/:size/:filename').get(asset.image);
    app.route('/:catalog/:id/thumbnail').get(asset.thumbnail);

    app.route('/:catalog/infinite').get(search.infinite);
    app.route('/:catalog/:id').get(asset.index);
    app.route('/:catalog').get(search.catalog);


};
