'use strict';

/**
 * Clears the index.
 */

module.exports = function(state) {
  return state.es.indices.delete({
    index: state.index
  }).then(function() {
    console.log('Index cleared.');
    return state;
  });
};
