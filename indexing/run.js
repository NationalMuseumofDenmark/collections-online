'use strict';

/**
 * Running the indexing procedure.
 */

var Q = require('q');

var steps = [
	require('./initialize/elastic-search-client'),
	require('./initialize/elastic-search-index'),
	require('./initialize/cip-client'),
	require('./initialize/cip-categories'),
	require('./initialize/mode'),
	require('./modes/run'),
	require('./post-processing/inherit-metadata'),
	require('./post-processing/delete-removed-assets'),
	require('./post-processing/print-asset-exceptions')
];

function run(state) {
	// TODO: Consider having a mode and referecen parameter on the run method,
	// for this module to be controlled by other modules.

  if(!state) {
    state = {};
  }
  state.assetExceptions = [];
  state.indexedAssetIds = [];

	return steps.reduce(Q.when, new Q(state));
}

module.exports = run;

if(module.id === '.') {
	// Call run here, if the module was not loaded by some other module.
	run()
  .fail(function(err) {
    console.error('An error occured!');
    if(err && err.stack) {
      console.error(err.stack);
    } else {
      console.error(err);
    }

    setTimeout(function() {
      console.log('Bye bye ...');
      // We are ready to die .. with an error code
      process.exit(1);
    }, 1000);
  }).finally(function() {
    setTimeout(function() {
      console.log('Finishing ...');
      // We are ready to die ..
      process.exit(0);
    }, 1000);
  });
}
