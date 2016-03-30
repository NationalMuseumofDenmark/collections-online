'use strict';

/**
 * Running the indexing procedure in the catalog mode.
 */

function parseReference(reference) {
  var result = [];
  reference = reference.split(',');
  // In the catalog mode, each catalog is a combination of a catalog alias
  // and an optional page offset in the catalog traversing.
  for (var r in reference) {
    reference[r] = reference[r].split('+');
    if (reference[r].length === 1) {
      reference[r][1] = 0;
    } else if (reference[r].length === 2) {
      // Let's make this nummeric.
      reference[r][1] = parseInt(reference[r][1], 10);
    } else {
      throw new Error('Every reference in the catalog mode must ' +
          'contain a catalog alias optionally seperated by a plus (+), ' +
          'ex: ES+10, for the tenth page offset of the ES catalog.');
    }
    result.push({
      catalogAlias: reference[r][0],
      offset: reference[r][1]
    });
  }
  return result;
}

module.exports.generateQueries = function(state) {
  var relevantCatalogs = parseReference(state.reference);
  return relevantCatalogs.map(function(catalogReference) {
    return {
      catalogAlias: catalogReference.catalogAlias,
      query: 'ID *',
      offset: catalogReference.offset || 0
    };
  });
};
