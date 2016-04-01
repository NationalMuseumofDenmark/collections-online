'use strict';

var config = require('../../lib/config/config');

function generateTimestamp(date) {
  if (date && typeof(date) === 'object' && date.year && !date.timestamp) {
    var month = date.month || 1;
    var day = date.day || 1;
    date.timestamp = new Date(date.year, month - 1, day).getTime();
  }
  return date;
}

module.exports = function(state, metadata) {
  // Let's find all dates
  var dateFields = config.assetFields.filter((field) => {
    return field.type === 'date';
  });
  dateFields.forEach((field) => {
    metadata[field.short] = generateTimestamp(metadata[field.short]);
  });
  return metadata;
};
