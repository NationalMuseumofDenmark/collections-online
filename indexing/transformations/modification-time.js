'use strict';

var DATA_REGEXP = new RegExp('\\d+');

module.exports = function(state, metadata) {
  var modificationTime = DATA_REGEXP.exec(metadata.modification_time);
  if (modificationTime && modificationTime.length > 0) {
    var timestamp = parseInt(modificationTime[0], 10);
    var modificationDate = new Date(timestamp);
    metadata.modification_time = {
      year: modificationDate.getFullYear(),
      month: modificationDate.getMonth() + 1,
      day: modificationDate.getDate(),
      timestamp
    };
  }
  return metadata;
};
