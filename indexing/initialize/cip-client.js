'use strict';

/**
 * This initializes the CIP client on the state.
 * @param {Object} state The state of which we are about to initialize.
 */

var cip = require('../../lib/services/natmus-cip');

function cipClient(state) {
	console.log('Initializing the CIP client');

	return cip.initSession()
	.then(function(cipClient) {
		state.cip = cipClient;
		return state;
	});
}

module.exports = cipClient;
