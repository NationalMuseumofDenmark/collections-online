'use strict';

/**
 * This initializes the list of catalogs through the CIP client.
 *
 * @param {Object} state The state of which we are about to initialize.
 */

var cip = require('../../lib/services/cip');
var config = require('../../lib/config');

module.exports = function(state) {
  state.catalogs = Object.keys(config.cip.catalogs);
  return state;
};
