'use strict';

/**
 * Running the indexing procedure in whatever mode the state suggests.
 */

var Q = require('q');
var processQuery = require('../processing/query');
var config = require('../../lib/config');

const POST_PROCESSING_STEPS = [
  require('../post-processing/inherit-metadata'),
  require('../post-processing/delete-removed-assets'),
  require('../post-processing/derive-in-rotation-series'),
  require('../post-processing/clear-index')
];

module.exports = function(state) {
  var mode = require('./' + state.mode);

  state.queries = mode.generateQueries(state);

  // Add any indexing restrictions from the configuration.
  state.queries.forEach((q) => {
    if (config.cip.indexingRestriction) {
      q.query = '(' + q.query + ') AND ' + config.cip.indexingRestriction;
    }
  });

  console.log('\n=== Starting to process ===\n');

  // TODO: Consider if the two new Q(state)s need to be wrapped in promises.

  return state.queries.reduce(function(promise, query) {
    return promise.then(function(state) {
      query.indexedAssetIds = [];
      query.assetExceptions = [];
      return processQuery(state, query);
    });
  }, new Q(state)).then(function(state) {
    console.log('\n=== Finished processing ===\n');
    return POST_PROCESSING_STEPS.reduce(Q.when, new Q(state));
  });
};
