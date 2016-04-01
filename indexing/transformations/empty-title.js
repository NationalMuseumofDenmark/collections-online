'use strict';

module.exports = function(state, metadata) {
  metadata.short_title = metadata.short_title.trim();
  if (metadata.short_title === '') {
    metadata.short_title = null;
  }
  return metadata;
};
