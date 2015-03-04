'use strict';

var cip = require('../cip-methods.js');
var cip_categories = require('../cip-categories.js');
var asset_mapping = require('../asset-mapping.js');
var asset_player = require('../asset-player.js');
var license_mapping = require('../license-mapping.js');
var config = require('../config/config');

var helpers = {};

helpers.format_number = function(n, decimals) {
    if(typeof(n) !== 'undefined' && n !== null) {
        return parseFloat(n).toFixed(decimals).replace('.', ',');
    } else {
        return n;
    }
};

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

helpers.leaf_category_by_tag = function leaf_category_by_tag(categories, tag) {
    for(var i=0; i < categories.length; i++) {
        for(var j=0; j < categories[i].length; j++) {
            if(categories[i][j].name === tag) {
                var tag_categories = categories[i];
                // Return the leaf / last.
                return tag_categories[tag_categories.length-1];
            }
        }
    }
};

helpers.get_link = function get_link(req, path) {
    var host = req.headers["x-forwarded-host"] || req.get('host');
    return 'http://' +host+ '/' + path;
};

helpers.get_category_link = function get_category_link(req, alias, category) {
    return helpers.get_link(req, alias + '?cat=' + category.id);
};

exports.index = function(req, res, next) {
    var url = req.url;
    var catalog_alias = req.params.catalog;
    var id = req.params.id;
    var id_str = catalog_alias + '-' + id;

    // Get the es_client that was initiated in the server.js
    var es_client = req.app.get('es_client');

    es_client.getSource({
        index: config.es_assets_index,
        type: 'asset',
        id: id_str
    }).then(function( metadata ) {
        if(metadata.review_state === null ||
            (metadata.review_state.id !== 3 && metadata.review_state.id !== 4)
        ) {
            throw new Error( 'Not reviewed for public access.' );
        } else {
            return metadata;
        }
    })
    .then(function(metadata) {
        var player = asset_player.determine_player( metadata );

        var category_storage = req.app.get('cip_categories')[catalog_alias];
        var formatted_categories = cip_categories.format_categories(category_storage, metadata.categories);
        var catalog = cip.find_catalog(req.app.get('cip_catalogs'), catalog_alias);

        var related_assets = [].concat(metadata.related_master_assets, metadata.related_sub_assets);
        related_assets = related_assets.map(function(related_asset) {
            // The location of a thumbnail image of the related asset.
            related_asset.src = '/' + [metadata.catalog, related_asset.id, 'image', 300].join('/');
            // The hypertext reference to the related asset.
            related_asset.href = '/' + [metadata.catalog, related_asset.id].join('/');
            if(related_asset.relation === '6fe3b22c-390e-44b3-99e5-df25de94893b' &&
                metadata.cropping_status && metadata.cropping_status.id === 3) {
                // TODO: Use this in the view.
                related_asset.relation_explained = 'Friskærings original';
            }
            return related_asset;
        });

        related_assets = {
            visible: related_assets.slice(0, 4),
            additional: related_assets.slice(4)
        };

        var render_parameters = {
            'id': id_str,
            'item': metadata,
            'categories': formatted_categories,
            'catalog': catalog,
            'player': player,
            'helpers': helpers,
            'sources': asset_player.generate_sources(req, player, url, metadata),
            'related_assets': related_assets,
            'req': req
        };

        return render_parameters;
    })
    .then(function(render_parameters) {
        if(render_parameters) {
            res.render('asset.jade', render_parameters);
        }
    })
    .then(undefined, function(error) {
        if(error.message === 'Not Found') {
            res.status(404);
            res.render('404.jade', {'req': req});
        } else {
            res.status(500);
            next(error);
        }
    });
};
