'use strict';

var request = require('request');
var cip = require('../cip-methods.js');
var cip_categories = require('../cip-categories.js');
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
    var catalog_alias = req.params.catalog;
    var id = req.params.id;

    cip.init_session().then(function(nm) {
            cip.get_asset(nm, catalog_alias, id, function(items) {
                if(items.length === 0) {
                    res.write('Asset could not be found');
                    res.end();
                    return;
                }

                var id_str = catalog_alias + '-' + id;
                var formatted_item = asset_mapping.format_result(items[0].fields);
                var category_storage = req.app.get('cip_categories')[catalog_alias];
                var formatted_categories = cip_categories.format_categories(category_storage, formatted_item.categories);
                var catalog = cip.find_catalog(req.app.get('cip_catalogs'), catalog_alias);
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
                            'catalog': catalog,
                            'image_src': image_src,
                            'image_src_set': image_src_set,
                            'helpers': helpers,
                            'req': req});
            });
        });
};
