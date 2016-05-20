'use strict';

/**
 * Running the indexing procedure.
 */

var Q = require('q');

var steps = [
  require('./initialize/elastic-search-index'),
  require('./initialize/cip-catalogs'),
  require('./initialize/cip-categories'),
  require('./initialize/mode'),
  require('./modes/run'),
  require('./post-processing/print-asset-exceptions')
];

function run(state) {
  // TODO: Consider having a mode and referecen parameter on the run method,
  // for this module to be controlled by other modules.

  if (!state) {
    state = {};
  }

  return steps.reduce(Q.when, new Q(state));
}

module.exports = run;

if (module.id === '.') {
  // Call run here, if the module was not loaded by some other module.
  run().then(function() {
    console.log('\nAll done - good bye!');
    process.exit(0);
  }, function(err) {
    console.error('An error occured!');
    console.error(err.stack || err);
    process.exit(1);
  });
}
