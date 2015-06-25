'use strict';

/**
 * This initializes the indexing mode, from the runtime parameters.
 * @param {Object} state The state of which we are about to initialize.
 */

var MODES = {
	recent: 'recent',
	all: 'all',
	catalog: 'catalog',
	single: 'single',
	clear: 'clear'
};

var MODE_DESCRIPTIONS = {
	recent: 'Syncronize the most recently changed assets.',
	all: 'Syncronize all assets across all catalogs.',
	catalog: 'Syncronize only a single catalog or a comma seperated list.',
	single: 'Syncronize only a single asset or a comma seperated list.',
	clear: 'Deletes the entire index.'
};

// A function to check that a user supplied mode is valid.
function isValidMode(suggested_mode) {
	for(var m in MODES) {
		if(suggested_mode === MODES[m]) {
			return m;
		}
	}
	return false;
}

function usageMessage() {
	var message = ['Please select modes from:'];
	for(var m in MODES) {
		message.push(' * ' +MODES[m]+ ': '+MODE_DESCRIPTIONS[m]);
	}
	return message.join('\n');
}

function mode(state) {
	console.log('Initializing the indexing mode');

	var args = process.argv;
	if(args && args.length <= 2) {
		// No arguments supplied, just node and the app script's path.
		state.mode = MODES.recent;
	} else if(args && args.length >= 3) {
		var suggested_mode = args[2];
		state.mode = isValidMode(suggested_mode);
		if(args.length >= 4) {
			state.reference = args[3].split(',');
		}
	}
	
	if(!state.mode) {
		throw new Error('Unrecognized mode!' +'\n'+ usageMessage());
	}

	return state;
}

module.exports = mode;