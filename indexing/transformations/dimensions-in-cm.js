'use strict';

var CM_PR_IN = 2.54;

module.exports = function(state, metadata) {
  metadata.width_cm = metadata.width_in * CM_PR_IN;
  metadata.height_cm = metadata.height_in * CM_PR_IN;
  return metadata;
};
