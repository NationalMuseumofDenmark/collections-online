'use strict';

/**
 * The post processing step that steps through all currently indexed assets
 * and deletes every asset that was not indexed during this run of the update to
 * the index.
 */

var Q = require('q');
var es = require('../../lib/services/elasticsearch');
var _ = require('lodash');

module.exports = function(state) {
  var activity = 'Post-processing to delete removed assets';

  console.log('\n=== ' + activity + ' ===\n');

  if (['all', 'catalog', 'single'].indexOf(state.mode) !== -1) {
    var deletedAssetIds;
    if (state.mode === 'all' || state.mode === 'catalog') {
      deletedAssetIds = state.queries.reduce(function(deletedAssetIds, query) {
        return deletedAssetIds.then(function(deletedAssetIds) {
          if (query.offset > 0) {
            console.log('Skipping a query that had a non-zero offset.');
            return deletedAssetIds;
          }
          // Scroll search for all assets in the catalog that was not indexed.
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
            return deletedAssetIds;
          });
        });
      }, new Q([]));
    } else {
      deletedAssetIds = state.queries.reduce(function(deletedAssetIds, query) {
        var assetIds = query.assetIds.map((assetId) => {
          return query.catalogAlias + '-' + assetId;
        });
        var moreDeletedAssetIds = _.difference(assetIds, query.indexedAssetIds);
        return _.union(deletedAssetIds, moreDeletedAssetIds);
      }, []);
    }

    return Q.when(deletedAssetIds).then(function(deletedAssetIds) {
      console.log('Deleting', deletedAssetIds.length, 'asset(s)');
      var actions = deletedAssetIds.map(function(deletedAssetId) {
        return {delete: {_id: deletedAssetId}};
      });
      return es.bulk({
        index: state.index,
        type: 'asset',
        body: actions
      });
    }).then(function() {
      return state;
    });
  } else {
    console.log('Removed assets gets deleted only in "all", "catalog" or ' +
                '"single" mode.');
    return state;
  }
};
