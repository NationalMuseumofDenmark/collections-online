'use strict';

var querystring = require('querystring');

var cip = require('../cip-methods.js');
var cip_categories = require('../cip-categories.js');
var asset_mapping = require('../asset-mapping.js');
var asset_player = require('../asset-player.js');
var license_mapping = require('../license-mapping.js');

var helpers = {};

helpers.license_tag = function license_tag(license_id) {
    return license_mapping.licenses[license_id];
};

helpers.magic360_options = function magic360_options(image_rotation_set) {
    var small_images = image_rotation_set.small;
    var large_images = image_rotation_set.large;
    var options = {
        "magnifier-shape": "circle",
        "magnifier-width": "100%",
        "columns": small_images.length,
        "images": small_images.join(' '),
        "large-images": large_images.join(' '),
    };
    var result = "";
    for(var o in options) {
        result += o + ": " +options[o]+ "; ";
    }
    return result;
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
    var id_str = catalog_alias + '-' + id;
    var asset; // This will be overwritten once a result is in - could be rewritten.

    cip.init_session()
    .then(function(nm) {
        return cip.get_asset(nm, catalog_alias, id)
        .then(function(items) {
            if(items === null || items.length === 0) {
                res.status(404);
                res.render('404.jade', {'req': req});
                return null;
            }
            asset = items[0];
            var formatted_item = asset_mapping.format_result(asset.fields);
            return asset_mapping.extend_metadata(nm, catalog_alias, asset, formatted_item);
        })
        .then(function(formatted_item) {
            /* Only entries tagged as public or public with id can be shown */
            if(formatted_item.review_state == null || (formatted_item.review_state.id != 3 && formatted_item.review_state.id != 4)) {
                res.status(403);
                res.render('404.jade', {'req': req});
                return;
            }

            var player = asset_player.determine_player( formatted_item );

            var category_storage = req.app.get('cip_categories')[catalog_alias];
            var formatted_categories = cip_categories.format_categories(category_storage, formatted_item.categories);
            var catalog = cip.find_catalog(req.app.get('cip_catalogs'), catalog_alias);
            var item_title = formatted_item.short_title || 'Ingen titel';
            item_title = item_title.replace(/(\r\n|\n|\r)/gm,"");
            var dashed_title = item_title.replace(/ /gi, '-').replace('/' ,'-');
            var encoded_title = querystring.escape(dashed_title);
            var filename = formatted_item.filename;

            var render_parameters = {
                'id': id_str,
                'item': formatted_item,
                'categories': formatted_categories,
                'catalog': catalog,
                'player': player,
                'helpers': helpers,
                'req': req
            };

            if(player === "image-rotation") {
                return cip.get_related_assets(asset, 'isalternatemaster')
                .then(function(relations) {
                    console.log(relations);
                    return asset_player.generate_sources(req, {
                        url: url,
                        player: player,
                        asset_id: formatted_item.id,
                        filename: filename,
                        catalog_alias: catalog_alias,
                        related_assets_ids: relations.ids
                    }).then(function(sources) {
                        render_parameters['sources'] = sources;
                        return render_parameters;
                    });
                });
            } else {
                return asset_player.generate_sources(req, {
                    url: url,
                    player: player,
                    filename: filename,
                    encoded_title: encoded_title
                }).then(function(sources) {
                    render_parameters['sources'] = sources;
                    return render_parameters;
                });
            }
        })
        .then(function(render_parameters) {
            if(render_parameters) {
                res.render('asset.jade', render_parameters);
            }
        });
    }, function( err ) {
        console.error("Couldn't show the asset's index page.");
        console.error( err.stack );
        res.status(500);
        res.render('error.jade', {'req': req});
    });
};
