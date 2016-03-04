'use strict';

/**
 * Clears the index.
 */

var es = require('../../lib/services/elasticsearch');

module.exports = function(state) {
  return es.indices.delete({
    index: state.index
  }).then(function() {
    console.log('Index cleared.');
    return state;
  });
};
