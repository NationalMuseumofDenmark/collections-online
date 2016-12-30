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
      metadata.related = related;
      return metadata;
    });
  })
  .then(function(metadata) {
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

    return {
      'metadata': metadata,
      'assetSection': assetSection({
        'showCallToAction': showCallToAction,
        'showGeotagging': showGeotagging,
        'editGeotagging': editGeotagging
      }),
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
