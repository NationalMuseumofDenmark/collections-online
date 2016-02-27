'use strict';

/**
 * This initializes the list of catalogs through the CIP client.
 *
 * @param {Object} state The state of which we are about to initialize.
 */

module.exports = function(state) {
  console.log('Fetching the CIP catalogs');

  return state.cip.getCatalogs().then(function(catalogs) {
    state.catalogs = catalogs.map(function(catalog) {
      return catalog.alias;
    });
    return state;
  });
};
