'use strict';

/**
 * Running the indexing procedure in the single mode.
 */

function parseReference(reference) {
  var result = [];
  if (typeof(reference) === 'string') {
    reference = reference.split(',');
  }
  // In the single mode, each asset is a combination of a catalog alias
  // and the asset ID, eg. DNT-101
  for (var r in reference) {
    reference[r] = reference[r].split('/');
    if (reference[r].length !== 2) {
      throw new Error('Every reference in the single mode must ' +
        'contain a catalog alias seperated by a slash (/), ' +
        'ex: ES/1234,DNT/123');
    } else {
      result.push({
        catalogAlias: reference[r][0],
        assetId: reference[r][1]
      });
    }
  }
  return result;
}

module.exports.generateQueries = function(state) {
  var reference = parseReference(state.reference);
  var assetsPerCatalog = {};

  reference.forEach(function(assetReference) {
    if (!assetsPerCatalog[assetReference.catalogAlias]) {
      assetsPerCatalog[assetReference.catalogAlias] = [];
    }
    assetsPerCatalog[assetReference.catalogAlias].push(assetReference.assetId);
  });

  var queries = [];

  Object.keys(assetsPerCatalog).forEach(function(catalogAlias) {
    var assetIds = assetsPerCatalog[catalogAlias];
    var query = assetIds.map(function(assetId) {
      return 'ID is "' + assetId + '"';
    }).join(' OR ');

    queries.push({
      catalogAlias: catalogAlias,
      query: query,
      assetIds: assetIds
    });
  });

  return queries;
};
