'use strict';

/**
 * The processor handling an entire result.
 */

var Q = require('q');

var processAsset = require('./asset');

var ASSETS_PER_REQUEST = 100;

var ADDITIONAL_FIELDS = [
	'{af4b2e71-5f6a-11d2-8f20-0000c0e166dc}', // Related Sub Assets
	'{af4b2e72-5f6a-11d2-8f20-0000c0e166dc}' // Related Master Assets
];

function getResultPage(result, pointer, num_rows) {
	var deferred = Q.defer();

	result.cip.ciprequest( [
			'metadata',
			'getfieldvalues',
			'web'
		], {
			collection: result.collection_id,
			startindex: pointer,
			maxreturned: num_rows,
			field: ADDITIONAL_FIELDS
		}, function(response) {
			if(response === null || typeof(response.items) === 'undefined') {
				console.error('Unexpected response:', response);
				deferred.reject( new Error('The request for field values returned a null / empty result.') );
			} else {
				var returnvalue = [];
				for (var i = 0; i < response.items.length; i++) {
					// TODO: Consider if this even works - where is cip_asset defined?
					/*
					var asset = new cip_asset.CIPAsset(this, response.items[i], result.catalog);
					returnvalue.push( asset );
					*/
					returnvalue.push(response.items[i]);
				}
				deferred.resolve( returnvalue );
			}
		}, deferred.reject
	);

	return deferred.promise;
}

/**
 * Process a specific result page, with assets.
 */
function processResultPage(state, result, pageIndex) {
	var catalog = result.catalog;

	var totalPages = Math.ceil(result.total_rows / ASSETS_PER_REQUEST);
	console.log('Queuing page number', pageIndex+1, 'of', totalPages, 'in the', catalog.alias, 'catalog.');

	return getResultPage(result, pageIndex * ASSETS_PER_REQUEST, ASSETS_PER_REQUEST)
	.then(function(assetsOnPage) {
		console.log('Got metadata of page ' +(pageIndex+1)+ ' from the ' +result.catalog.alias+ ' catalog.');
		var assetPromises = assetsOnPage.map(function(asset) {
			asset.catalog = catalog.alias;
			var assetPromise = processAsset(state, asset);
			return assetPromise;
		});
		return Q.all(assetPromises);
	});
}

/**
 * Recursively handle the assets on pages, giving a breath first traversal
 * of the CIP webservice.
 */
function processNextResultPage(state, result, indexedAssetsIds) {
	// If the function was called without a value for the indexedAssetIds.
	if(!indexedAssetsIds) {
		indexedAssetsIds = [];
	}
	// Do we still have pages in the result?
	if(result.pageIndex * ASSETS_PER_REQUEST < result.total_rows) {
		return processResultPage(state, result, result.pageIndex)
		.then(function(newIndexedAssetIds) {
			// Increment the page index of this catalog
			result.pageIndex++;
			// Let's concat the newly index asset ids.
			indexedAssetsIds = indexedAssetsIds.concat(newIndexedAssetIds);
			return processNextResultPage(state, result, indexedAssetsIds);
		});
	} else {
		// No more pages in the result, let's return the final array of indexed
		// asset ids.
		return new Q(indexedAssetsIds);
	}
}

function processResult(state, result) {
	console.log('Processing a result of', result.total_rows, 'assets');
	// TODO: Support an offset defined by state.catalogPageIndex
	if(!result.pageIndex) {
		result.pageIndex = 0;
	}
	// Start handling the result's page recursively.
	return processNextResultPage(state, result);
}

module.exports = processResult;
