'use strict';

/**
 * Running the indexing procedure in the catalog mode.
 */

var all = require('./all');

function recent(state) {
	var timeDelta;
	if(state.reference) {
		timeDelta = state.reference[0];
	} else {
		timeDelta = '1d';
	}
	return all(state, '$today-'+timeDelta);
}

module.exports = recent;