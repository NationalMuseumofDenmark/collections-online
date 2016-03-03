'use strict';

var assetMapping = require('../../lib/asset-mapping.js');

module.exports = function(state, metadata) {
  var transformedMetadata = assetMapping.formatResult(metadata);
  // The catalog will be removed when formatting.
  transformedMetadata.catalog = metadata.catalog;
  return transformedMetadata;
};
