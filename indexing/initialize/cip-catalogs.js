'use strict';

/**
 * This initializes the list of catalogs through the CIP client.
 *
 * @param {Object} state The state of which we are about to initialize.
 */

var cip = require('../../lib/services/natmus-cip');

module.exports = function(state) {
  console.log('Fetching the CIP catalogs');

  return cip.initSession().then(() => {
    return cip.getCatalogs().then((catalogs) => {
      state.catalogs = catalogs.map((catalog) => {
        return catalog.alias;
      });
      return state;
    });
  });
};
