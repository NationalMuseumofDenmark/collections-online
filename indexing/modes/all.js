'use strict';

/**
 * Running the indexing procedure in the all mode.
 */

module.exports.generateQueries = function(state) {
  return state.catalogs.map(function(catalogAlias) {
    return {
      catalogAlias: catalogAlias,
      query: 'ID *'
    };
  });
};

module.exports.generateQueries = function() {
  return [];
};
