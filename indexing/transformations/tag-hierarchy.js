'use strict';

var _ = require('lodash');

const FIELD_HIERARCHY = [
  'tags',
  'tags_crowd',
  'tags_vision'
];

module.exports = function(state, metadata) {
  // A list of tags already consumed - it should not be possible to consume a
  // tag twice.
  var consumedTags = [];
  // Loop through the fields in the hierarchy.
  FIELD_HIERARCHY.forEach(function(field) {
    // Take out any tags that has already been consumed.
    metadata[field] = _.difference(metadata[field], consumedTags);
    // Add these tags to the list of consumed tags.
    consumedTags = _.union(consumedTags, metadata[field]);
  });
  return metadata;
};
