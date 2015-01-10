'use strict';

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

exports.index = function(req, res, next) {
    var url = req.url;
    var catalog_alias = req.params.catalog;
    var id = req.params.id;
    var id_str = catalog_alias + '-' + id;

    // Get the es_client that was initiated in the server.js
    var es_client = req.app.get('es_client');

    es_client.getSource({
        index: 'assets',
        type: 'asset',
        id: id_str
    }).then(function( metadata ) {
        if(metadata.review_state === null ||
            (metadata.review_state.id !== 3 && metadata.review_state.id !== 4)
        ) {
            res.status(403);
            res.render('404.jade', {'req': req});
            return;
        } else {
            return metadata;
        }
    }, function(error) {
        if(error.message === 'Not Found') {
            res.status(404);
            res.render('404.jade', {'req': req});
        } else {
            next(error);
        }
    })
    .then(function(metadata) {
        var player = asset_player.determine_player( metadata );

        var category_storage = req.app.get('cip_categories')[catalog_alias];
        var formatted_categories = cip_categories.format_categories(category_storage, metadata.categories);
        var catalog = cip.find_catalog(req.app.get('cip_catalogs'), catalog_alias);

        var render_parameters = {
            'id': id_str,
            'item': metadata,
            'categories': formatted_categories,
            'catalog': catalog,
            'player': player,
            'helpers': helpers,
            'sources': asset_player.generate_sources(req, player, url, metadata),
            'req': req
        };

        return render_parameters;
    })
    .then(function(render_parameters) {
        if(render_parameters) {
            res.render('asset.jade', render_parameters);
        }
    });
};
