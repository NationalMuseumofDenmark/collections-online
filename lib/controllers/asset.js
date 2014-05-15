'use strict';

var request = require('request');
var cip = require('../cip-methods.js');
var asset_mapping = require('./asset-mapping.js');

var helpers = {};

function format_result(fields) {
    var result = {};
    var result_mapping = asset_mapping.result_mapping;

    for(var i=0; i < result_mapping.length; ++i) {
        if(result_mapping[i].key in fields) {
            result[result_mapping[i].short] = fields[result_mapping[i].key];
        }
    }
    return result;
}

exports.image = function(req, res) {
    var catalog = req.params.catalog;
    var id = req.params.id;

    cip.init_session(function(nm) {
        cip.get_catalogs(nm, function(catalogs) {
            cip.get_asset(nm, catalogs, catalog, id, function(items) {
                request.get(items[0].get_preview_url()).pipe(res);
            });
        });
    });
};

exports.index = function(req, res) {
    var catalog = req.params.catalog;
    var id = req.params.id;

    cip.init_session(function(nm) {
        cip.get_catalogs(nm, function(catalogs) {
            cip.get_asset(nm, catalogs, catalog, id, function(items) {
                if(items.length === 0) {
                    res.write('Asset could not be found');
                    res.end();
                    return;
                }

                res.render('asset',
                           {'id': catalog + '-' + id,
                            'item': format_result(items[0].fields),
                            'image': req.url + '/image',
                            'helpers': helpers});
            });
        });
    });
};
