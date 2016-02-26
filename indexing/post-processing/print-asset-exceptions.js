'use strict';

/**
 * The post processing step that steps through all currently indexed assets
 * and deletes every asset that was not indexed during this run of the update to
 * the index.
 */

function printAssetExceptions(state) {

  if (state.assetExceptions.length > 0) {
    console.error('Some errors occurred indexing assets:');
    for (var e = 0; e < state.assetExceptions.length; e++) {
      var err = state.assetExceptions[e];

      var message = '--- Exception ';
      message += (e + 1);
      message += '/';
      message += state.assetExceptions.length;
      message += ' (';
      message += err.catalogAlias;
      message += '-';
      message += err.assetId;
      message += ') ---';

      console.error(message);
      console.error(err.innerError.stack || err.innerError.message);
    }
  }

  return state;
}

module.exports = printAssetExceptions;
