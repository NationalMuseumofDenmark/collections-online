'use strict';

/**
 * Running the indexing procedure in the single mode.
 */

var Q = require('q');

var processAssetReference = require('../processing/asset-reference');

function parseReference(reference) {
  if(typeof(reference) === 'string') {
    reference = reference.split(',');
  }
	// In the single mode, each asset is a combination of a catalog alias
	// and the asset ID, eg. DNT/101
	for(var r in reference) {
		reference[r] = reference[r].split('-');
		if(reference[r].length !== 2) {
			throw new Error( 'Every reference in the single mode must '+
					'contain a catalog alias seperated by a dash (-), '+
					'ex: ES-1234');
		}
	}
	return reference;
}

function single(state) {
	// Parse the reference
	state.reference = parseReference(state.reference);
	// Print this for the console.
	console.log('Running in the single mode: ', state.reference.join(', '));

	var assetPromises = [];
	for(var a in state.reference) {
		var catalogAlias = state.reference[a][0];
		var assetId = state.reference[a][1];
		var assetPromise = processAssetReference(state, catalogAlias, assetId);
		assetPromises.push( assetPromise );
	}

	return Q.all(assetPromises).then(function(indexedAssetIdsOrErrors) {
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

module.exports = single;
