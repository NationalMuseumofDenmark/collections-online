'use strict';

var asset = require('./controllers/asset');
var images = require('./controllers/images');
var middleware = require('./middleware');
var search = require('./controllers/search');
var json = require('./controllers/json');
var sitemap = require('./controllers/sitemap');
var robots = require('./controllers/robots');
var elasticsearch = require('./controllers/elasticsearch');
var geoTagging = require('./controllers/geo-tagging');
var motifTagging = require('./controllers/motif-tagging');

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

    // Search results
    app.route('/').get(search.result);

    app.route('/:catalog').get(search.catalog);
    app.route('/:catalog/infinite').get(search.infinite);

    // A safe proxy for the elastic search index.
    app.route('/es/*').get(elasticsearch.proxy);

    app.route('/:catalog/sitemap.xml').get(sitemap.single);

    // Tags
    app.route('/:catalog/:id(\\d+)/suggested-motif-tags').get(motifTagging.suggestions);
    // Image handling
    app.route('/:catalog/:id(\\d+)/download/:size/:filename').get(images.download_image);
    app.route('/:catalog/:id(\\d+)/download/:filename').get(images.download);

    app.route('/:catalog/:id(\\d+)/image/:size').get(images.image);
    app.route('/:catalog/:id(\\d+)/thumbnail').get(images.thumbnail);
    app.route('/:catalog/:id(\\d+)').get(asset.index);

    app.route('/:catalog/:id(\\d+)/save-geotag').post(geoTagging.save);
};
