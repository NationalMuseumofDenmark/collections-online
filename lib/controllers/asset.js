'use strict';

var cip = require('../services/cip');
var es = require('../services/elasticsearch');
var cipCategories = require('../cip-categories.js');
var assetPlayer = require('../asset-player.js');
var assetSection = require('../asset-section.js');
var config = require('../config');

exports.index = function(req, res, next) {
  // Remove any query string or trailing slashes from the url.
  var url = req.url.split('?').shift().replace(/\/$/,'');

  var catalogAlias = req.params.catalog;
  var id = req.params.id;
  var esId = catalogAlias + '-' + id;

  es.getSource({
    index: config.esAssetsIndex,
    type: 'asset',
    id: esId
  })
  .then(function(metadata) {
    var relatedAssets = [].concat(metadata.related_sub_assets,
                                  metadata.related_master_assets);
    if (relatedAssets.length === 0) {
      metadata.relatedAssets = [];
      return metadata;
    } else {
      var relatedAssetById = {};
      // Parse related assets to descriptions of documents to fetch.
      relatedAssets.forEach(function(asset) {
        relatedAssetById[catalogAlias + '-' + asset.id] = asset;
      });

      return es.mget({
        'index': config.esAssetsIndex,
        'type': 'asset',
        'body': {
          'ids': Object.keys(relatedAssetById)
        }
      }).then(function(response) {
        metadata.relatedAssets = response.docs.filter((asset) => {
          return asset.found;
        }).map((asset) => {
          return relatedAssetById[asset._id];
        });
        return metadata;
      });
    }
  })
  .then(function(metadata) {
    // Make sure these related assets are available if requested

    // Create URLs for the related assets
    metadata.relatedAssets.forEach(function(asset) {
      asset.src = '/' + [metadata.catalog, asset.id, 'thumbnail'].join('/');
      asset.href = '/' + [metadata.catalog, asset.id].join('/');
    });

    var player = assetPlayer.determinePlayer(metadata);

    var categoriesRaw = req.app.get('categories')[catalogAlias];
    var categories = cipCategories.formatCategories(categoriesRaw,
                                                    metadata.categories);
    var catalog = cip.findCatalog(req.app.get('catalogs'), catalogAlias);

    // Split up the visible and additional assets.
    var relatedAssets = metadata.relatedAssets;

    // Enable geotagging on all assets og call to action if not location exists
    var noNMGeotag = !metadata.google_maps_coordinates;
    var noExistingGeotag = !metadata.latitude && !metadata.longitude;
    var showGeotagging = config.enableGeotagging;
    var editGeotagging = showGeotagging && noNMGeotag;
    var showCallToAction = showGeotagging && noExistingGeotag;

    // Determine if downloadable
    var downloadable = true;
    // ID 7 = All rights reserved
    if (metadata.license && metadata.license.id === 7) {
      downloadable = false;
    }

    return {
      'id': esId,
      'metadata': metadata,
      'assetSection': assetSection({
        'showCallToAction': showCallToAction,
        'showGeotagging': showGeotagging,
        'editGeotagging': editGeotagging,
        'catalogs': req.app.get('catalogs')
      }),
      'categories': categories,
      'catalog': catalog,
      'downloadable': downloadable,
      'player': player,
      'relatedAssets': relatedAssets,
      'showGeotagging': showGeotagging,
      'showCallToAction': showCallToAction,
      'sources': assetPlayer.generateSources(req, player, url, metadata),
      'req': req
    };
  })
  .then(function(renderParameters) {
    if (renderParameters) {
      res.render('asset.jade', renderParameters);
    }
  })
  .then(undefined, function(error) {
    if (error.message === 'Not Found') {
      error.status = 404;
    }
    next(error);
  });
};
