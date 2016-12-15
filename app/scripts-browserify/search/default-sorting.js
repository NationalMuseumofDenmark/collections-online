const config = require('collections-online/shared/config');

/**
 * This module gets the default search field from the configuration.
 */

const DEFAULT_SORTING = Object.keys(config.sortOptions)
.reduce(function(result, o) {
  var option = config.sortOptions[o];
  if(!result && option.default) {
    return o;
  }
  return result;
}, null);

module.exports = DEFAULT_SORTING;
