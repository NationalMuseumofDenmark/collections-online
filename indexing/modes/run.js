'use strict';

/**
 * Running the indexing procedure in whatever mode the state suggests.
 */

function run(state) {
  var mode = require('./' + state.mode);
  return mode(state);
}

module.exports = run;
