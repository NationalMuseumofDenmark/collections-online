'use strict';

var cip = require('../services/natmus-cip'),
    es = require('../services/elasticsearch'),
    cip_categories = require('../cip-categories.js'),
    asset_mapping = require('../asset-mapping.js'),
    asset_player = require('../asset-player.js'),
    license_mapping = require('../license-mapping.js'),
    config = require('../config/config');

var helpers = {};

helpers.format_number = function(n, decimals) {
    if(typeof(n) !== 'undefined' && n !== null) {
        return parseFloat(n).toFixed(decimals).replace('.', ',');
    } else {
        return n;
    }
};

helpers.filesize_mb = function(filesize) {
    if(filesize && filesize.value) {
        var mb = filesize.value / 1024 / 1024;
        // Formatted
        mb = helpers.format_number(mb, 1);
        return mb + " MB";
    } else {
        return undefined;
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
        if(categories[i]) {
            for(var j=0; j < categories[i].length; j++) {
                if(categories[i][j].name === tag) {
                    var tag_categories = categories[i];
                    // Return the leaf / last.
                    return tag_categories[tag_categories.length-1];
                }
            }
        }
    }
    return null;
};

helpers.get_link = function get_link(req, path) {
    var host = req.headers["x-forwarded-host"] || req.get('host');
    return 'http://' +host+ '/' + path;
};

helpers.get_category_link = function get_category_link(req, alias, category) {
    return helpers.get_link(req, alias + '?cat=' + category.id);
};

exports.index = function(req, res, next) {
    // Remove any query string or trailing slashes from the url.
    var url = req.url.split("?").shift().replace(/\/$/,'');

    var catalog_alias = req.params.catalog;
    var id = req.params.id;
    var id_str = catalog_alias + '-' + id;

    es.getSource({
        index: config.es_assets_index,
        type: 'asset',
        id: id_str
    }).then(function( metadata ) {
        if(!metadata.review_state ||
          (metadata.review_state.id !== 3 && metadata.review_state.id !== 4)
        ) {
            var err = new Error('Not reviewed for public access.');
            err.status = 404;
            throw err;
        } else {
            return metadata;
        }
    })
    .then(function(metadata) {
      var relatedAssets = [].concat(metadata.related_master_assets,
                                    metadata.related_sub_assets);


      var relatedAssetById = {};
      var relatedAssetIds = [];
      // Parse related assets to descriptions of documents to fetch.
      relatedAssets.forEach(function(asset) {
        relatedAssetById[asset.id] = asset;
        relatedAssetIds.push(catalog_alias + '-' + asset.id);
      });

      return es.mget({
        "index": config.es_assets_index,
        "type": "asset",
        "_source_include": ["review_state"],
        "body": {
          "ids": relatedAssetIds
        }
      }).then(function(response) {
        metadata.relatedAssets = response.docs.filter(function(asset) {
          // Reviewed for public access.
          return asset.found &&
                 asset._source.review_state &&
                 (asset._source.review_state.id === 3 ||
                  asset._source.review_state.id === 4);
        }).map(function(asset) {
          var catalogAndId = (asset._id || '').split('-');
          if(catalogAndId.length === 2) {
            var assetId = catalogAndId[1];
            return relatedAssetById[assetId];
          } else {
            throw new Error('Expected assets returned to be "-" seperated');
          }
        });
        return metadata;
      });
    })
    .then(function(metadata) {
        metadata.relatedAssets.forEach(function(asset) {
          asset.src = '/' + [metadata.catalog, asset.id,'image',300].join('/');
          asset.href = '/' + [metadata.catalog, asset.id].join('/');
        });

        var player = asset_player.determine_player( metadata );

        var category_storage = req.app.get('cip_categories')[catalog_alias];
        var formatted_categories = cip_categories.format_categories(category_storage, metadata.categories);
        var catalog = cip.findCatalog(req.app.get('cip_catalogs'), catalog_alias);

        // Split up the visible and additional assets.
        var relatedAssets = {
          visible: metadata.relatedAssets.slice(0, 4),
          additional: metadata.relatedAssets.slice(4)
        };

        var showGeotagging = false;
        var showCallToAction = false;
        if(config.enableGeotagging) {
          var noCoordinates = !metadata.latitude && !metadata.longitude;
          var rightCatalog = catalog.alias==='FHM';
          showGeotagging    = rightCatalog && !metadata.google_maps_coordinates;
          showCallToAction  = showGeotagging && noCoordinates;
        }


        var render_parameters = {
            'id': id_str,
            'item': metadata,
            'categories': formatted_categories,
            'catalog': catalog,
            'player': player,
            'relatedAssets': relatedAssets,
            'showGeotagging': showGeotagging,
            'showCallToAction': showCallToAction,
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
    })
    .then(undefined, function(error) {
        if(error.message === 'Not Found') {
            error.status = 404;
        }
        next(error);
    });
};
