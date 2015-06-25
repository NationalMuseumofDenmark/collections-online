'use strict';

/**
 * Running the indexing procedure in the all mode.
 */

var Q = require('q');

var cip = require('../../lib/cip-methods.js');
var processCatalogReference = require('../processing/catalog-reference');

function all(state, modifiedSince) {
	// First - let's grab all catalogs from the CIP.
	return cip.get_catalogs(state.cip).then(function(catalogs) {
		var catalogAliases = catalogs.map(function(catalog) {
			return catalog.alias;
		});

		return catalogAliases.reduce(function(prevCatalogPromise, catalogAlias) {
			return prevCatalogPromise.then(function(indexedAssetIdsOrErrors) {
				indexedAssetIdsOrErrors.forEach(function(idOrError) {
					if(typeof(idOrError) === 'string') {
						state.indexedAssetIds.push(idOrError);
					} else {
						state.assetExceptions.push(idOrError);
					}
				});
				return processCatalogReference(state, catalogAlias, 0, modifiedSince);
			});
		}, new Q([]));
	}).then(function() {
		return state;
	});
}

module.exports = all;