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
    res.render('asset.pug', {
      'metadata': metadata,
      'assetSection': assetSection(),
      'req': req
    });
  })
  .then(null, function(error) {
    if (error.message === 'Not Found') {
      error.status = 404;
    }
    next(error);
  });
};
