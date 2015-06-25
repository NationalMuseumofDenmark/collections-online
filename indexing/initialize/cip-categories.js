'use strict';

var cipCategories = require('../../lib/cip-categories.js');

/**
 * This initializes the CIP categories.
 * @param {Object} state The state of which we are about to initialize.
 */

function initializeCipCategories(state) {
	console.log('Initializing CIP categories.');

	state.categories = {};

	return cipCategories.load_categories()
	.then(function(result) {
		// The categories pr catalog has been fetched from Cumulus.
		for(var i=0; i < result.length; ++i) {
			state.categories[result[i].id] = result[i];
		}

		var categories_count = Object.keys(state.categories).length;
		console.log('Loaded categories for', categories_count, 'catalogs');
		return state;
	});
}

module.exports = initializeCipCategories;