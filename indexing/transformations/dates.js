'use strict';

var DATA_REGEXP = new RegExp('\\d+');
var config = require('../../lib/config');

function zeroPad(num) {
  num = String(num);
  if (num.length < 2) {
    num = '0' + num;
  }
  return num;
}

function convertDateStrings(date) {
  if(date && typeof(date) === 'string') {
    var date = DATA_REGEXP.exec(date);
    if (date && date.length > 0) {
      var timestamp = parseInt(date[0], 10);
      var modificationDate = new Date(timestamp);
      return {
        year: modificationDate.getFullYear(),
        month: modificationDate.getMonth() + 1,
        day: modificationDate.getDate(),
        timestamp
      };
    }
  }
  return date;
}

function generateTimestamp(date) {
  if (date && typeof(date) === 'object' && date.year && !date.timestamp) {
    var month = zeroPad(date.month || 1);
    var day = zeroPad(date.day || 1);
    date.timestamp = `${date.year}-${month}-${day}`;
  }
  return date;
}

module.exports = function(state, metadata) {
  // Let's find all dates
  var dateFields = config.assetFields.filter((field) => {
    return field.type === 'date';
  });

  // Parse date fields given as strings
  dateFields.forEach((field) => {
    if(typeof(metadata[field.short]) === 'string') {
      metadata[field.short] = convertDateStrings(metadata[field.short]);
    }
  });

  // Generate a timestamp for every date
  dateFields.forEach((field) => {
    metadata[field.short] = generateTimestamp(metadata[field.short]);
  });
  return metadata;
};
