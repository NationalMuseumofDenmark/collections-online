'use strict';

var request = require('request');
var cip = require('../cip-methods.js');
var asset_mapping = require('../asset-mapping.js');
var license_mapping = require('./license-mapping.js');

var helpers = {};

helpers.license_tag = function license_tag(license_id) {
    return license_mapping.licenses[license_id];
};

exports.image = function(req, res) {
    var catalog = req.params.catalog;
    var id = req.params.id;
    var size = req.params.size;

    var url = 'http://samlinger.natmus.dk/CIP/preview/image/' + catalog + '/' + id + '/?size=' + size;
    return request.get(url).pipe(res);
};

exports.thumbnail = function(req, res) {
    var catalog = req.params.catalog;
    var id = req.params.id;

    var url = 'http://samlinger.natmus.dk/CIP/preview/thumbnail/' + catalog + '/' + id;
    return request.get(url).pipe(res);
};

exports.index = function(req, res) {
    var url = req.url;
    var catalog = req.params.catalog;
    var id = req.params.id;

    cip.init_session(function(nm) {
            cip.get_asset(nm, catalog, id, function(items) {
                if(items.length === 0) {
                    res.write('Asset could not be found');
                    res.end();
                    return;
                }

                var id_str = catalog + '-' + id;
                var formatted_item = asset_mapping.format_result(items[0].fields);
                var category_storage = req.app.get('cip_categories')[catalog];
                var formatted_categories = format_categories(category_storage, formatted_item.categories);
                var image_src = url + '/image/1200';
                var image_src_set = {
                    400: url + '/image/400',
                    800: url + '/image/800',
                    1200: url + '/image/1200'
                };

                res.render('asset',
                           {'id': id_str,
                            'item': formatted_item,
                            'categories': formatted_categories,
                            'image_src': image_src,
                            'image_src_set': image_src_set,
                            'helpers': helpers});
            });
        });
};
