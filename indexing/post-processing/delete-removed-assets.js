'use strict';

/**
 * The post processing step that steps through all currently indexed assets
 * and deletes every asset that was not indexed during this run of the update to
 * the index.
 */

var Q = require('q');
var es = require('../../lib/services/elasticsearch');

module.exports = function(state) {
  var activity = 'Post-processing to delete removed assets';
  console.log('\n=== ' + activity + ' ===\n');

  if (state.mode === 'all' || state.mode === 'catalog') {
    return state.queries.map(function(query) {
      if (query.offset > 0) {
        console.log('Skipping a query that had a non-zero offset.');
        return;
      }

      console.log('Deleting every asset in the',
                  query.catalogAlias,
                  'catalog except the',
                  query.indexedAssetIds.length,
                  'assets that was just indexed');
      // Scroll search for all assets in the catalog that was not indexed.
      var deletedAssetIds = [];

      return es.scrollSearch({
        'query': {
          'bool': {
            'must': {
              'match': {
                'catalog': query.catalogAlias
              }
            },
            'must_not': {
              'ids': {
                'values': query.indexedAssetIds
              }
            }
          }
        }
      }, function(deletedAsset) {
        deletedAssetIds.push(deletedAsset._id);
      }).then(function() {
        var actions = deletedAssetIds.map(function(deletedAssetId) {
          return {delete: {_id: deletedAssetId}};
        });
        return es.bulk({
          index: state.index,
          type: 'asset',
          body: actions
        });
      });
    }).reduce(Q.when, null).then(function() {
      return state;
    });
  } else {
    console.log('Removed assets gets deleted only in "all" or "catalog" mode.');
    return state;
  }
};
