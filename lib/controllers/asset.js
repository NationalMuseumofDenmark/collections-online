'use strict';

var cip = require('collections-online-cumulus/services/cip');
var es = require('../services/elasticsearch');
var assetPlayer = require('../asset-player');
var section = require('../section');
var config = require('../config');

/**
 * Renders an asset's landing page
 */
exports.index = function(req, res, next) {
  var collection = req.params.collection;
  var id = req.params.id;

  es.getSource({
    index: config.es.assetsIndex,
    type: 'asset',
    id: collection + '-' + id
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
        relatedAssetById[collection + '-' + asset.id] = asset;
      });

      return es.mget({
        'index': config.es.assetsIndex,
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
      // Generate the src that the related image thumbnail is loaded from
      asset.src = '/' + [
        metadata.catalog,
        'asset',
        asset.id,
        'thumbnail'
      ].join('/');
      // Generate the link that the related image refers to
      asset.href = '/' + [
        metadata.catalog,
        'asset',
        asset.id
      ].join('/');
    });

    var player = assetPlayer.determinePlayer(metadata);

    // TODO: Move this to the collections-online-cumulus package
    var catalog = cip.findCatalog(req.app.get('catalogs'), collection);

    // Split up the visible and additional assets.
    var relatedAssets = metadata.relatedAssets;

    // Enable geotagging on all assets og call to action if not location exists
    var noNMGeotag = !metadata.google_maps_coordinates;
    var noExistingGeotag = !metadata.latitude && !metadata.longitude;
    var showGeotagging = config.features.geotagging;
    var editGeotagging = showGeotagging && noNMGeotag;
    var showCallToAction = showGeotagging && noExistingGeotag;

    // Determine if downloadable
    var downloadable = true;
    // ID 7 = All rights reserved
    if (metadata.license && metadata.license.id === 7) {
      downloadable = false;
    }

    return {
      'id': collection + '-' + id,
      'metadata': metadata,
      'assetSection': section('asset')({
        'showCallToAction': showCallToAction,
        'showGeotagging': showGeotagging,
        'editGeotagging': editGeotagging,
        'catalogs': req.app.get('catalogs')
      }),
      'catalog': catalog,
      'downloadable': downloadable,
      'player': player,
      'relatedAssets': relatedAssets,
      'showGeotagging': showGeotagging,
      'showCallToAction': showCallToAction,
      'sources': assetPlayer.generateSources(req, player, req.baseUrl, metadata),
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
