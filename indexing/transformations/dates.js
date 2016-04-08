'use strict';

var config = require('../../lib/config/config');

function zeroPad(num) {
  num = String(num);
  if (num.length < 2) {
    num = '0' + num;
  }
  return num;
}

function generateTimestamp(date) {
  if (date && typeof(date) === 'object' && date.year) {// && !date.timestamp) {
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
  dateFields.forEach((field) => {
    metadata[field.short] = generateTimestamp(metadata[field.short]);
    //console.log(field.short, metadata[field.short]);
  });
  return metadata;
};
