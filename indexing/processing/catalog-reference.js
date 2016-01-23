'use strict';

/**
 * The processor handling a single asset reference (catalog alias + ID)
 */

var Q = require('q');

var processResult = require('./result');

function catalogReference(state, catalogAlias, offset, modifiedSince) {
	// Request a single asset based on it's catalog and id and use the
	// handle_next_result_page method to handle the result.
	var deferred = Q.defer();

	// Precondition: The catalog has it's alias defined.
	if(catalogAlias === undefined) {
		throw new Error('The catalog´s alias was undefined');
	}

	var querystring;
	if(typeof(modifiedSince) === 'string') {
		querystring = '"Record Modification Date" >= ' + modifiedSince;
	} else {
		querystring = 'ID *';
	}

	var catalog = {alias: catalogAlias};

	console.log('Queuing a catalog', catalog.alias, 'offset =', offset);

	state.cip.criteriaSearch({
		catalog: catalog
	}, querystring, null, function(result) {
		// TODO: Consider checking that the result returned exactly one asset.
		result.pageIndex = offset;
		// Hang on to the result.
		result.catalog = catalog;
		// Process the next page in the search result.
		processResult(state, result).then(deferred.resolve);
	}, deferred.reject);

	return deferred.promise;
}

module.exports = catalogReference;
