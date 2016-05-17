'use strict';

/**
 * The processor handling an entire result.
 */

var Q = require('q');
var cip = require('../../lib/services/cip');

var processAsset = require('./asset');

var ASSETS_PER_REQUEST = 100;
var VISION_ASSETS_PER_REQUEST = 25;
var VISION_TAGS_PER_100s = 10000;
var AVG_TAG_CHARACTERS_PER_ASSET = 30;
var VISION_THROTTLE_SPEED = Math.ceil(100 / (VISION_TAGS_PER_100s /
                                             (VISION_ASSETS_PER_REQUEST *
                                              AVG_TAG_CHARACTERS_PER_ASSET)));

var ADDITIONAL_FIELDS = [
  '{af4b2e71-5f6a-11d2-8f20-0000c0e166dc}', // Related Sub Assets
  '{af4b2e72-5f6a-11d2-8f20-0000c0e166dc}' // Related Master Assets
];

function assetsPerRequest(state) {
  var isIndexVision = state.indexVisionTags || state.indexVisionTagsForce;
  return (isIndexVision ? VISION_ASSETS_PER_REQUEST : ASSETS_PER_REQUEST);
}


function getResultPage(state, result, pointer, rowCount) {
  return cip.request([
    'metadata',
    'getfieldvalues',
    'web'
  ], {
    collection: result.collection_id,
    startindex: pointer,
    maxreturned: rowCount,
    field: ADDITIONAL_FIELDS
  }).then(function(response) {
    if (!response ||
        !response.body ||
        typeof(response.body.items) === 'undefined') {
      console.error('Unexpected response:', response);
      throw new Error('The request for field values returned an empty result.');
    } else {
      var result = [];
      for (var i = 0; i < response.body.items.length; i++) {
        result.push(response.body.items[i]);
      }
      return result;
    }
  });
}

/**
 * Process a specific result page, with assets.
 */
function processResultPage(state, result, pageIndex) {
  var catalog = result.catalog;

  var totalPages = Math.ceil(result.total_rows / assetsPerRequest(state));
  console.log('Queuing page number',
              pageIndex + 1,
              'of',
              totalPages,
              'in the',
              catalog.alias,
              'catalog.');

  return getResultPage(state,
                       result,
                       pageIndex * assetsPerRequest(state),
                       assetsPerRequest(state))
  .then(function(assetsOnPage) {
    console.log('Got metadata of page',
                pageIndex + 1,
                'from the',
                result.catalog.alias,
                'catalog.');
    var assetPromises = assetsOnPage.map(function(asset) {
      asset.catalog = catalog.alias;
      var assetPromise = processAsset(state, asset);
      return assetPromise;
    });
    return Q.all(assetPromises);
  });
}

/**
 * Recursively handle the assets on pages, giving a breath first traversal
 * of the CIP webservice.
 */
function processNextResultPage(state, result, indexedAssetsIds) {
  // If the function was called without a value for the indexedAssetIds.
  if (!indexedAssetsIds) {
    indexedAssetsIds = [];
  }
  var startTime = Date.now();

  // Do we still have pages in the result?
  if (result.pageIndex * assetsPerRequest(state) < result.total_rows) {
    return processResultPage(state, result, result.pageIndex)
    .then(function(newIndexedAssetIds) {
      // Increment the page index of this catalog
      result.pageIndex++;
      // Let's concat the newly index asset ids.
      indexedAssetsIds = indexedAssetsIds.concat(newIndexedAssetIds);
      return new Promise(function(resolve, reject) {

        if (state.indexVisionTagsPauseCounter >= assetsPerRequest(state)) {
          state.indexVisionTagsPauseCounter -= assetsPerRequest(state);
          var waitTime = VISION_THROTTLE_SPEED * 1000 -
                          (Date.now() - startTime);
          console.log('Throttle to '+ VISION_THROTTLE_SPEED +
                      ' seconds so we don\'t overload vision',
                      waitTime);
          if (waitTime < 0) {
            resolve();
          } else {
            setTimeout(function() { resolve(); }, waitTime);
          }

        } else {
          resolve();
        }

      }).then(function() {
        console.log('Fetch next result page');
        return processNextResultPage(state, result, indexedAssetsIds);
      });
    });
  } else {
    // No more pages in the result, let's return the final array of indexed
    // asset ids.
    return new Q(indexedAssetsIds);
  }
}

module.exports = function(state, query, result) {
  console.log('Processing a result of ' + result.total_rows + ' assets');
  // TODO: Support an offset defined by state.catalogPageIndex
  if (!result.pageIndex) {
    result.pageIndex = 0;
  }
  // Start handling the result's page recursively.
  return processNextResultPage(state, result)
  .then(function(indexedAssetIdsOrErrors) {
    indexedAssetIdsOrErrors.forEach(function(idOrError) {
      if (typeof(idOrError) === 'string') {
        query.indexedAssetIds.push(idOrError);
      } else {
        query.assetExceptions.push(idOrError);
      }
    });
    return state;
  });
};
