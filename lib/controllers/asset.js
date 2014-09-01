'use strict';

var querystring = require('querystring');

var cip = require('../cip-methods.js');
var cip_categories = require('../cip-categories.js');
var asset_mapping = require('../asset-mapping.js');
var license_mapping = require('../license-mapping.js');

var helpers = {};


helpers.license_tag = function license_tag(license_id) {
    return license_mapping.licenses[license_id];
};

helpers.category_by_tag = function category_by_tag(categories, tag) {
    for(var i=0; i < categories.length; i++) {
        for(var j=0; j < categories[i].length; j++) {
            if(categories[i][j].name === tag) {
                return categories[i];
            }
        }
    }

    return [];
};

exports.index = function(req, res) {
    var url = req.url;
    var catalog_alias = req.params.catalog;
    var id = req.params.id;

    cip.init_session().then(function(nm) {
            cip.get_asset(nm, catalog_alias, id, function(items) {
                if(items === null || items.length === 0) {
                    res.write('Asset could not be found');
                    res.end();
                    return;
                }

                var id_str = catalog_alias + '-' + id;
                var formatted_item = asset_mapping.format_result(items[0].fields);

                /* Only entries tagged as public or public with id can be shown */
                if(formatted_item.review_state.id != 3 && formatted_item.review_state.id != 4) {
                    res.status(403).write('Access denied');
                    res.end();
                    return;
                }
                var category_storage = req.app.get('cip_categories')[catalog_alias];
                var formatted_categories = cip_categories.format_categories(category_storage, formatted_item.categories);
                var catalog = cip.find_catalog(req.app.get('cip_catalogs'), catalog_alias);
                var item_title = formatted_item.short_title || 'Ingen titel';
                var dashed_title = item_title.replace(/ /gi, '-');
                var encoded_title = querystring.escape(dashed_title);
                var image_src = url + '/image/1200/';
                var image_src_set = {
                    400: url + '/image/400',
                    800: url + '/image/800',
                    1200: url + '/image/1200',
                    2000: url + '/image/2000',
                    // Downloads
                    download_400: url + '/download/400/' + encoded_title + '.jpg',
                    download_800: url + '/download/800/' + encoded_title + '.jpg',
                    download_1200: url + '/download/1200/' + encoded_title + '.jpg',
                    download_2000: url + '/download/2000/' + encoded_title + '.jpg',
                    // TIF download
                    download: url + '/download/' + encoded_title + '.tif'
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
        }, function() {
            console.log("Session not available");
            res.write("System temporarily down, please try again");
            res.end();
            return;
        });
};
