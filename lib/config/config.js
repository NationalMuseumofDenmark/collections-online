'use strict';

var _ = require('lodash');

if (process.env.NODE_ENV) {
	console.log('Loading '+process.env.NODE_ENV+' configuration');
	var environmentConfig = require('./env/' + process.env.NODE_ENV + '.js');
}

/**
 * Load environment configuration
 */
module.exports = _.merge(
    require('./env/all.js'),
    environmentConfig || {});
