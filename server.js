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

var es_client = new elasticsearch.Client({host: config.es_host});
app.set('es_client', es_client);

var categories = {};

cip_categories.load_categories(function(result) {
    for(var i=0; i < result.length; ++i) {
        categories[result[i].id] = result[i].tree;
    }
    app.set('cip_categories', categories);
});


// Start server
app.listen(config.port, config.ip, function () {

    console.log('Express server listening on %s:%d, in %s mode', config.ip, config.port, app.get('env'));
});

// Expose app
exports = module.exports = app;
