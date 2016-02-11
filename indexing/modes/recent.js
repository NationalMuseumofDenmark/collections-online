'use strict';

/**
 * Running the indexing procedure in the catalog mode.
 */

var all = require('./all');

function recent(state) {
	var timeDelta;
	if(state.reference) {
		timeDelta = state.reference;
	} else {
		timeDelta = '10m';
	}
	return all(state, '$now-'+timeDelta);
}

module.exports = recent;
