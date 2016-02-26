'use strict';

/**
 * The processor handling a single asset reference (catalog alias + ID)
 */

var processResult = require('./result');

function assetReference(state, catalogAlias, assetId) {
  // Request a single asset based on it's catalog and id and use the
  // handle_next_result_page method to handle the result.

  // Precondition: The catalog has it's alias defined.
  if (catalogAlias === undefined) {
    throw new Error('The catalog´s alias was undefined');
  }

  if (assetId === undefined) {
    throw new Error('The asset´s id was undefined');
  }
  var catalog = {alias: catalogAlias};

  console.log('Queuing single asset in catalog',
              catalog.alias, 'asset id =', assetId);

  var idString = 'ID is "' + assetId + '"';

  return state.cip.criteriaSearch({
    catalog: catalog
  }, idString, null).then(function(result) {
    // TODO: Consider checking that the result returned exactly one asset.
    result.pageIndex = 0;
    // Hang on to the result.
    result.catalog = catalog;
    // Process the next page in the search result.
    return processResult(state, result);
  });
}

module.exports = assetReference;
