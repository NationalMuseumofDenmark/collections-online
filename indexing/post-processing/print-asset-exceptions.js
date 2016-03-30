'use strict';

/**
 * The post processing step that steps through all currently indexed assets
 * and deletes every asset that was not indexed during this run of the update to
 * the index.
 */

function printAssetExceptions(state) {

  var assetExceptions = state.queries.reduce(function(result, query) {
    return result.concat(query.assetExceptions);
  }, []);

  if (assetExceptions.length > 0) {
    var activity = 'Some errors occurred indexing assets';
    console.log('\n=== ' + activity + ' ===\n');

    assetExceptions.forEach(function(error, errorIndex) {
      var message = '--- Exception ';
      message += (errorIndex + 1);
      message += '/';
      message += assetExceptions.length;
      message += ' (';
      message += error.catalogAlias;
      message += '-';
      message += error.assetId;
      message += ') ---';

      console.error(message);
      console.error(error.innerError.stack || error.innerError.message);
    });
  }

  return state;
}

module.exports = printAssetExceptions;
