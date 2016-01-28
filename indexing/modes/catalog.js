'use strict';

/**
 * Running the indexing procedure in the catalog mode.
 */


var Q = require('q');

var processCatalogReference = require('../processing/catalog-reference');

function parseReference(reference) {
	reference = reference.split(',');
	// In the catalog mode, each catalog is a combination of a catalog alias
	// and an optional page offset in the catalog traversing.
	for(var r in reference) {
		reference[r] = reference[r].split('+');
		if(reference[r].length === 1) {
			reference[r][1] = 0;
		} else if (reference[r].length === 2) {
			// Let's make this nummeric.
			reference[r][1] = parseInt(reference[r][1], 10);
		} else {
			throw new Error( 'Every reference in the catalog mode must '+
					'contain a catalog alias optionally seperated by a plus (+), '+
					'ex: ES+10, for the tenth page offset of the ES catalog.');
		}
	}
	return reference;
}

function catalog(state) {
	// Parse the reference
	state.reference = parseReference(state.reference);

	var summary = 'Running in the catalog mode: ';
	var catalogSummaries = [];

	state.reference.forEach(function(catalog) {
		if(catalog[1] === 0) {
			catalogSummaries.push(catalog[0]);
		} else {
			catalogSummaries.push(catalog[0] + ' (offset by ' + catalog[1] +' pages)');
		}
	});
	console.log(summary + catalogSummaries.join(', '));

	var catalogPromises = [];
	for(var a in state.reference) {
		var catalogAlias = state.reference[a][0];
		var offset = state.reference[a][1];
		var catalogPromise = processCatalogReference(state, catalogAlias, offset);
		catalogPromises.push( catalogPromise );
	}

	return Q.all(catalogPromises).then(function(indexedAssetIdsOrErrors) {
		// Concat all arrays into one.
		Array.prototype.concat.apply([], indexedAssetIdsOrErrors).forEach(function(idOrError) {
			if(typeof(idOrError) === 'string') {
				state.indexedAssetIds.push(idOrError);
			} else {
				state.assetExceptions.push(idOrError);
			}
		});
		return state;
	});
}

module.exports = catalog;
