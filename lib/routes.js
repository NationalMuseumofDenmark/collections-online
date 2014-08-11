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
    // XML stuff
    app.route('/:catalog/sitemap.xml').get(xml.sitemap);

    // Json stuff
    app.route('/suggest.json').get(json.suggest);
    app.route('/main-menu/catalogs').get(json.mainmenu); // Get the catalogs for the main menu

    // Page templates
    app.route('/:catalog').get(search.catalog);
    app.route('/:catalog/:id/image/:size/:dummy').get(asset.image);
    app.route('/:catalog/:id/thumbnail').get(asset.thumbnail);
    app.route('/:catalog/:id').get(asset.index);
    app.route('/').get(search.index);
    app.route('/infinite/:catalog/:id').get(search.infinite); // Infinte scrolling
};
