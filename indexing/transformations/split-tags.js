'use strict';

module.exports = function(state, metadata) {
  // We want Cumulus to have a string, but elasticsearch to have an array.
  if (metadata.tags_vision && typeof(metadata.tags_vision) === 'string') {
    metadata.tags_vision = metadata.tags_vision.split(',');
  }
  if (metadata.tags_crowd && typeof(metadata.tags_crowd) === 'string') {
    metadata.tags_crowd = metadata.tags_crowd.split(',');
  }
  return metadata;
};
