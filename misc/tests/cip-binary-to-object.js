'use strict';

var cip = require('../../lib/services/cip');
var fs = require('fs');
var path = require('path');
var assert = require('assert');

var dataFilename = path.resolve(__dirname, 'related.base64');

fs.readFile(dataFilename, function(err, data) {
  if (err) {
    throw err;
  }

  var dataString = data.toString('utf8');
  var object = cip.binaryToObject(dataString);

  // Assetions.
  assert(object !== undefined,
    'The object returned from binary_to_object was expected to be defined.');
  assert(object.length === 23,
    'Expected the datafile to contain 23 referenced assets.');

  console.log(JSON.stringify(object, null, 4));
});
