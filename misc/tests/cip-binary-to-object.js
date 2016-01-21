'use strict';

var cip = require('../../lib/services/natmus-cip');
var fs = require('fs');
var path = require('path');
var assert = require('assert');

var data_filename = path.resolve(__dirname, 'related.base64');

fs.readFile(data_filename, function (err, data) {
	if (err) {
		throw err;
	}

	var data_string = data.toString('utf8');
	var object = cip.binaryToObject( data_string );

	// Assetions.
	assert(object !== undefined,
		'The object returned from binary_to_object was expected to be defined.');
	assert(object.length === 23,
		'Expected the datafile to contain 23 referenced assets.');

	console.log( JSON.stringify(object, null, 4) );
});
