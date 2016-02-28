'use strict';

/**
 * The post processing step that steps through all currently indexed assets
 * and deletes every asset that was not indexed during this run of the update to
 * the index.
 */

function printAssetExceptions(state) {

  state.queries.forEach(function(query) {
    if (query.assetExceptions && query.assetExceptions.length > 0) {
      console.error('\n=== Some errors occurred indexing assets ===\n');
      for (var e = 0; e < query.assetExceptions.length; e++) {
        var err = query.assetExceptions[e];

        var message = '--- Exception ';
        message += (e + 1);
        message += '/';
        message += query.assetExceptions.length;
        message += ' (';
        message += err.catalogAlias;
        message += '-';
        message += err.assetId;
        message += ') ---';

        console.error(message);
        console.error(err.innerError.stack || err.innerError.message);
      }
    }
  });

  return state;
}

module.exports = printAssetExceptions;
