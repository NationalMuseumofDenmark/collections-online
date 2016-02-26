'use strict';

/**
 * The processor handling a single asset reference (catalog alias + ID)
 */

var processResult = require('./result');

function catalogReference(state, catalogAlias, offset, modifiedSince) {
  // Request a single catalog based on it's alias.

  // Precondition: The catalog has it's alias defined.
  if (catalogAlias === undefined) {
    throw new Error('The catalog´s alias was undefined');
  }

  var querystring;
  if (typeof(modifiedSince) === 'string') {
    querystring = '"Record Modification Date" >= ' + modifiedSince;
  } else {
    querystring = 'ID *';
  }

  var catalog = {alias: catalogAlias};

  console.log('Queuing the', catalog.alias, 'catalog with offset', offset);

  return state.cip.criteriaSearch({
    catalog: catalog
  }, querystring, null).then(function(result) {
    // TODO: Consider checking that the result returned exactly one asset.
    result.pageIndex = offset;
    // Hang on to the result.
    result.catalog = catalog;
    // Process the next page in the search result.
    return processResult(state, result);
  });
}

module.exports = catalogReference;
