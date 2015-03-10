'use strict';

var express = require('express'),
    elasticsearch = require('elasticsearch'),
    cip = require('./lib/cip-methods.js'),
    cip_categories = require('./lib/cip-categories.js');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var config = require('./lib/config/config');
var app = express();
require('./lib/config/express')(app);

var es_client = new elasticsearch.Client({ host: config.es_host });
app.set('es_client', es_client);
app.set('site_title', config.site_title);
// Trust the X-Forwarded-* headers from the Nginx reverse proxy infront of
// the app (See http://expressjs.com/api.html#app.set)
app.set('trust proxy', 'loopback');

require('./lib/routes')(app);

es_client.count({
    index: config.es_assets_index
}).then(function(response) {
    console.log('Connecting to the Elasticsearch host', config.es_host);
    console.log('The assets index is created and contains', response.count, 'documents.');
}, function() {
    console.log('Could not connect to the Elasticsearch host', config.es_host);
    // We have an error in the communication with the Elasticsearch server
    // I is probably not started.
    console.error('Is the elasticsearch service started?');
    process.exit(1);
});

var categories = {};

cip_categories.load_categories().then(function(result) {
    for(var i=0; i < result.length; ++i) {
        categories[result[i].id] = result[i];
    }
    app.set('cip_categories', categories);
}).then(function() {
    cip.init_session().then(function(nm) {
        cip.get_catalogs(nm).then(function(catalogs) {
            app.set('cip_catalogs', catalogs);
        });
    });
}).then(function() {
    // Start server
    app.listen(config.port, config.ip, function () {
        console.log('Express server listening on %s:%d, in %s mode', config.ip, config.port, app.get('env'));
    });
});

// Expose app
exports = module.exports = app;
