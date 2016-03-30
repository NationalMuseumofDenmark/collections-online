'use strict';

var cip = require('../../lib/services/natmus-cip');

function relatedFilenameComparison(assetA, assetB) {
  var filenameA = assetA.filename;
  var filenameB = assetB.filename;
  return filenameA.localeCompare(filenameB);
}

module.exports = function(state, metadata) {
  // Transforms the binary representations of each relation.
  metadata.related_master_assets =
    cip.parseBinaryRelations(metadata.related_master_assets);
  metadata.related_sub_assets =
    cip.parseBinaryRelations(metadata.related_sub_assets);
  // Sort these by their filename.
  metadata.related_master_assets.sort(relatedFilenameComparison);
  metadata.related_sub_assets.sort(relatedFilenameComparison);
  return metadata;
};
