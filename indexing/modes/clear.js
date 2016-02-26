'use strict';

/**
 * Clears the index.
 */

function clear(state) {
  return state.es.indices.delete({
    index: process.env.ES_INDEX || 'assets'
  }).then(function() {
    console.log('Index cleared.');
    return state;
  });
}

module.exports = clear;
