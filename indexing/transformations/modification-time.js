'use strict';

var DATA_REGEXP = new RegExp('\\d+');

module.exports = function(state, metadata) {
  var modificationTime = DATA_REGEXP.exec(metadata.modification_time);
  if (modificationTime && modificationTime.length > 0) {
    metadata.modification_time = parseInt(modificationTime[0], 10);
  }
  return metadata;
};
