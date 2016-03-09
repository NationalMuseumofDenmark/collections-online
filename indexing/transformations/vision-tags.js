'use strict';

var union = require('lodash/union');
var config = require('../../lib/config/config');
var cip = require('../../lib/services/natmus-cip');

const TAGS_VISION_FIELD = '{6864395c-c433-2148-8b05-56edf606d4d4}';

function saveVisionTags(metadata, tags) {
  var values = {};
  values[TAGS_VISION_FIELD] = tags.join(',');
  return cip.setFieldValues(metadata.catalog, metadata.id, 'web', values);
}

module.exports = function(state, metadata) {
  // Let's save some cost and bandwidth and not analyze the asset unless
  // explicitly told. As in run only if one of the indexVison args
  // are specified.
  var runForced = state.indexVisionTagsForce;
  var runDefault = state.indexVisionTags && !metadata.tags_vision;
  var reviewState = metadata.review_state ? metadata.review_state.id : null;
  var isPublished = reviewState === 3 || reviewState === 4;

  if ((runForced || runDefault) && isPublished) {
    // Still here. Let's grab the image directly from Cumulus.
    var url = config.cip.baseURL + '/preview/thumbnail/';
    url += metadata.catalog + '/' + metadata.id;

    // Loading here to prevent circular dependency.
    var motif = require('../../lib/controllers/motif-tagging');

    return motif.fetchSuggestions(url, state.indexVisionTagsAPIFilter)
      .then(function(tags) {
        // Convert tags to a comma seperated string
        // Save the tags to Cumulus
        if (!metadata.tags_vision) {
          metadata.tags_vision = [];
        }
        var oldTagsSize = metadata.tags_vision.length;
        var tagsUnion = union(metadata.tags_vision, tags);
        var diffSize = tagsUnion.length - oldTagsSize;
        console.log('Derived', diffSize, 'new tags, using AI.');

        // If no new tags was added, we don't save
        if (diffSize === 0) {
          return metadata;
        }

        return saveVisionTags(metadata, tagsUnion).then(function(response) {
          if (response.statusCode !== 200) {
            throw new Error('Failed to set the field values');
          }
          metadata.tags_vision = tagsUnion;
          return metadata;
        });
      });
  }
  return metadata;
};
