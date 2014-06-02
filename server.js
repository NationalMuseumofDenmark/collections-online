'use strict';

var express = require('express'),
    path = require('path'),
    fs = require('fs'),
    cip = require('./lib/cip-methods.js'),
    cip_categories = require('./lib/cip-categories.js'),
    elasticsearch = require('elasticsearch');;

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var config = require('./lib/config/config');

var app = express();
require('./lib/config/express')(app);
require('./lib/routes')(app);

var es_client = new elasticsearch.Client();
app.set('es_client', es_client);

cip.init_session(function(nm) {
    cip.get_catalogs(nm, function(catalogs) {
        cip.get_category_tree(nm, catalogs[1], function(response) {
            var categories = new cip_categories.Categories(response, function(categories) {
                //categories.dump_tree(categories.tree);
            });
        });
    });
});

// Start server
app.listen(config.port, config.ip, function () {

    console.log('Express server listening on %s:%d, in %s mode', config.ip, config.port, app.get('env'));
});

// Expose app
exports = module.exports = app;
