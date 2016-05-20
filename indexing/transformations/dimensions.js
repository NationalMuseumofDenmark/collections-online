'use strict';

var CM_PR_IN = 2.54;

module.exports = function(state, metadata) {
  metadata.width_cm = metadata.width_in * CM_PR_IN;
  metadata.height_cm = metadata.height_in * CM_PR_IN;
  if (!metadata.resolution_dpi) {
    throw new Error('The dimensions transformation needs a resolution_dpi');
  }
  metadata.width_px = metadata.width_in * metadata.resolution_dpi;
  metadata.height_px = metadata.height_in * metadata.resolution_dpi;
  return metadata;
};
