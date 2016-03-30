'use strict';

/**
 * Running the indexing procedure in the catalog mode.
 */

module.exports.generateQueries = function(state) {
  var timeDelta;
  if (state.reference) {
    timeDelta = state.reference;
  } else {
    timeDelta = '10m';
  }
  return state.catalogs.map(function(catalogAlias) {
    return {
      catalogAlias: catalogAlias,
      query: '"Record Modification Date" >= $now-' + timeDelta
    };
  });
};
