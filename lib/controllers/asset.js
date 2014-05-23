'use strict';

var request = require('request');
var cip = require('../cip-methods.js');
var asset_mapping = require('./asset-mapping.js');
var license_mapping = require('./license-mapping.js');

var helpers = {};

helpers.license_tag = function license_tag(license_id) {
    return license_mapping.licenses[license_id];
}

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
    var size = req.params.size;

    var url = 'http://samlinger.natmus.dk/CIP/preview/image/' + catalog + '/' + id + '/?size=' + size;
    return request.get(url).pipe(res);
};

exports.index = function(req, res) {
    var url = req.url;
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

                var id_str = catalog + '-' + id;
                var formatted_items = format_result(items[0].fields);
                var image_src = url + '/image/800';
                var image_src_set = {
                    400: url + '/image/400',
                    800: url + '/image/800',
                    1200: url + '/image/1200'
                };

                res.render('asset',
                           {'id': id_str,
                            'item': formatted_items,
                            'image_src': image_src,
                            'image_src_set': image_src_set,
                            'helpers': helpers});
            });
        });
    });
};
