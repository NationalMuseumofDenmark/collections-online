'use strict';

const ds = require('../../services/documents');
const documentController = require('../document');
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
    return documentController.getRelatedMetadata(metadata).then(related => {
      // console.log('Related documents are in:', related);
      metadata.related = related;
      return metadata;
    });
  })
  .then(function(metadata) {
    // Make sure these related assets are available if requested
    /*
    // Create URLs for the related assets
    metadata.related.assets.forEach(function(asset) {
      // Generate the the base URL, taking into multiple types into account
      let assetId;
      if(asset.id.indexOf('-') !== -1) {
        let collectionAndId = asset.id.split('-');
        assetId = collectionAndId[collectionAndId.length-1];
      } else {
        assetId = asset.id;
      }
      var baseUrl = '/' + metadata.collection;
      if(Object.keys(config.types).length > 1) {
        // TODO: Move this logic to a seperate helper that generates URLs
        baseUrl += '/asset';
      }
      baseUrl += '/' + assetId;
      // Generate the link that the related asset refers to
      asset.href = baseUrl;
      // And the URL that shows a thumbnail of the asset
      asset.src = baseUrl + '/thumbnail';
    });

    // Split up the visible and additional assets.
    var relatedAssets = metadata.related.assets;
    */

    // Enable geotagging on all assets og call to action if not location exists
    // TODO fix with new API data
    var noNMGeotag = !metadata.location.verified.latitude
      || !metadata.location.verified.longitude;
    var noExistingGeotag = !metadata.latitude && !metadata.longitude;
    var showGeotagging = config.features.geoTagging;
    var editGeotagging = showGeotagging && noNMGeotag;
    var showCallToAction = showGeotagging && noExistingGeotag;

    // Determine if downloadable (ID 7 = All rights reserved)
    var downloadable = !metadata.license || metadata.license.id !== 7;

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
        'editGeotagging': editGeotagging
      }),
      'downloadable': downloadable,
      'showGeotagging': showGeotagging,
      'showCallToAction': showCallToAction,
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
