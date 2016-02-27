'use strict';

/**
 * Clears the index.
 */

module.exports = function(state) {
  return state.es.indices.delete({
    index: process.env.ES_INDEX || 'assets'
  }).then(function() {
    console.log('Index cleared.');
    return state;
  });
};
