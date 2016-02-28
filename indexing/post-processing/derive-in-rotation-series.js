'use strict';

/**
 * This post-processing step iterates the newly indexed assets in the
 * ElasticSearch index and sets their in_artifact_rotation_series and updates
 * their is_searchable value, so only the front-facing rotational image is
 * reachable when searching.
 */

var Q = require('q'),
    _ = require('lodash');

// TODO: Consider taking the 'Rotationsbilleder' category name from a
// configuration file.
const ROTATIONAL_IMAGES_CATEGORY_NAME = 'Rotationsbilleder';
const ROTATIONAL_IMAGES_RELATION_UUID = '9ed0887f-40e8-4091-a91c-de356c869251';

function scrollSearch(state, body, hitCallback) {
  return state.es.search({
    index: state.index,
    scroll: '30s', // Set to 30 seconds because we are calling right back
    size: 1000,
    body: body
  }).then(function getMoreUntilDone(response) {
    // If we are still getting hits - let's iterate over them.
    if (response.hits.hits.length > 0) {
      return response.hits.hits.map(hitCallback).reduce(Q.when, null)
      .then(function() {
        // Next scroll page please.
        var scrollId = response._scroll_id;
        return state.es.scroll({
          scrollId: scrollId,
          scroll: '30s'
        }).then(getMoreUntilDone);
      });
    }
  });
}

module.exports = function(state) {
  console.log('\n=== Post-processing to derive rotational series ===\n');

  // Let's take the queries one by one.
  return state.queries.map(function(query) {
    // First searching the elasticsearch index for assets that has been indexed
    // in this run and has master assets, gathering these master assets ids
    // as they may be main/frontal asset of a rotational series, which turns
    // the particular asset to be a part of a rotational series.
    var additionalAssetIds = [];

    return scrollSearch(state, {
      'query': {
        'bool': {
          'must': [{
            'ids': {
              'values': query.indexedAssetIds
            }
          }, {
            'match': {
              'related_master_assets.relation':
                ROTATIONAL_IMAGES_RELATION_UUID
            }
          }]
        }
      }
    }, function(hit) {
      // Determine whether or not this asset has a relation to a master
      // asset which is a main front facing image.
      var catalogAlias = hit._source.catalog;
      var masterAssets = hit._source.related_master_assets;
      masterAssets.forEach(function(masterAsset) {
        additionalAssetIds.push(catalogAlias + '-' + masterAsset.id);
      });
    }).then(function() {
      // Search for all assets that has been indexed in this run and which is
      // either in the rotational image category or has a master asset that might
      // be in the rotational image category.
      return scrollSearch(state, {
        'query': {
          'bool': {
            'must': [{
              'ids': {
                'values': _.union(query.indexedAssetIds, additionalAssetIds)
              }
            }, {
              'match': {
                'categories.name':
                  ROTATIONAL_IMAGES_CATEGORY_NAME
              }
            }]
          }
        }
      }, function(hit) {
        // Update the master asset so it's in_artifact_rotation_series is true
        // and the artifact_rotation_series_rank is 0.
        var actions = [
          {update: {_id: hit._id}},
          {
            doc: {
              'in_artifact_rotation_series': true,
              'artifact_rotation_series_rank': 0
            }
          }
        ];
        // Update all the sub-assets so their in_artifact_rotation_series is
        // true, their artifact_rotation_series_rank reflects their order in
        // the master assets related sub assets and their is_searchable is
        // false.
        var subAssets = hit._source.related_sub_assets || [];
        subAssets.filter(function(subAsset) {
          return subAsset.relation === ROTATIONAL_IMAGES_RELATION_UUID;
        }).forEach(function(subAsset, subAssetIndex) {
          var subAssetId = hit._source.catalog + '-' + subAsset.id;
          actions.push({update: {_id: subAssetId}});
          actions.push({
            doc: {
              'in_artifact_rotation_series': true,
              'artifact_rotation_series_rank': subAssetIndex + 1,
              'is_searchable': false
            }
          });
        });

        console.log('Updating a rotational master asset (' +
                    hit._id + ') and it´s',
                    subAssets.length,
                    'sub-assets.');
        return state.es.bulk({
          index: state.index,
          type: 'asset',
          body: actions
        });
      });
    });
  }).reduce(Q.when).then(function() {
    return state;
  });
};
