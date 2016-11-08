'use strict';

const cip = require('collections-online-cumulus/services/cip');
const es = require('../../services/elasticsearch');
const documentController = require('../document');
const assetPlayer = require('../../asset-player');
const config = require('../../config');

const section = require('../../section');
const assetSection = section('asset');

/**
 * Renders an asset's landing page
 */
exports.index = function(req, res, next) {
  return documentController.get(req, 'asset').then((metadata) => {
    // Read collection from the metadata catalog if not specified
    metadata.collection = metadata.collection || metadata.catalog;

    var relatedAssets = metadata.related.assets;

    if (relatedAssets.length > 0) {
      var relatedAssetById = {};
      // Parse related assets to descriptions of documents to fetch.
      relatedAssets.forEach(function(asset) {
        relatedAssetById[metadata.collection + '-' + asset.id] = asset;
      });

      return es.mget({
        'index': config.types.asset.index,
        'type': 'asset',
        'body': {
          'ids': Object.keys(relatedAssetById)
        }
      }).then(function(response) {
        metadata.related.assets = response.docs.filter((asset) => {
          return asset.found;
        }).map((asset) => {
          return relatedAssetById[asset._id];
        });
        return metadata;
      });
    }
    return metadata;
  })
  .then(function(metadata) {
    // Make sure these related assets are available if requested
    // Create URLs for the related assets
    metadata.related.assets.forEach(function(asset) {
      // Generate the the base URL, taking into multiple types into account
      var baseUrl = '/' + metadata.collection;
      if(Object.keys(config.types).length > 1) {
        // TODO: Move this logic to a seperate helper that generates URLs
        baseUrl += '/asset';
      }
      baseUrl += '/' + asset.id;
      // Generate the link that the related asset refers to
      asset.href = baseUrl;
      // And the URL that shows a thumbnail of the asset
      asset.src = baseUrl + '/thumbnail';
    });

    var player = assetPlayer.determinePlayer(metadata);

    // TODO: Move this to the collections-online-cumulus package
    var catalog = cip.findCatalog(req.app.get('catalogs'), metadata.collection);

    // Split up the visible and additional assets.
    var relatedAssets = metadata.related.assets;

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

    // Loops through all types of verified tags and produces an 'all' parameter
    metadata.tags.verified.all = Object.keys(metadata.tags.verified)
    .reduce((result, type) => {
      let tags = metadata.tags.verified[type];
      return result.concat(tags);
    }, []);

    return {
      'id': metadata.collection + '-' + metadata.id,
      'metadata': metadata,
      'assetSection': assetSection({
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
      res.render('asset.pug', renderParameters);
    }
  })
  .then(null, function(error) {
    if (error.message === 'Not Found') {
      error.status = 404;
    }
    next(error);
  });
};
