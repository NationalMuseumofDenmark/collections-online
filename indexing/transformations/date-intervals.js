'use strict';

var intervals = {
  'acceptance_timestamp': ['acceptance_time_from', 'acceptance_time_to'],
  'creation_timestamp': ['creation_time_from', 'creation_time_to']
};

module.exports = function(state, metadata) {
  Object.keys(intervals).forEach((destinationField) => {
    var date = intervals[destinationField].reduce((result, field) => {
      if (!result && metadata[field] && metadata[field].timestamp) {
        return metadata[field].timestamp;
      }
      return result;
    }, null);
    metadata[destinationField] = Date.parse(date);
  });
  return metadata;
};
