'use strict';

/**
 * Running the indexing procedure in whatever mode the state suggests.
 */

var Q = require('q'),
    processQuery = require('../processing/query');

module.exports = function(state) {
  var mode = require('./' + state.mode);

  var queries = mode.generateQueries(state);

  console.log('\n=== Starting to process ===\n');

  state.indexedAssetsIds = [];
  state.assetExceptions = [];

  return queries.reduce(function(promise, query) {
    return promise.then(function(state) {
      return processQuery(state, query);
    });
  }, new Q(state)).then(function(state) {
    console.log('\n=== Finished processing ===\n');
    return state;
  });
};
