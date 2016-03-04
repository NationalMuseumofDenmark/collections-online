'use strict';

/**
 * This initializes the ElasticSearch index.
 *
 * @param {Object} state The state of which we are about to initialize.
 */

var es = require('../../lib/services/elasticsearch');

module.exports = function(state) {
  console.log('Initializing the Elastic Search index');

  state.index = process.env.ES_INDEX || 'assets';

  return es.indices.exists({
    index: state.index
  }).then(function(exists) {
    if (exists) {
      console.log('Index was already created.');
      return state;
    } else {
      return es.indices.create({
        index: state.index,
        body: {
          'index': {
            'max_result_window': 100000 // We need this, so sitemaps can access all assets
          }
        }
      }).then(function() {
        console.log('Index created.');
        return state;
      }, function(err) {
        // TODO: Add a recursive check for this message.
        if (err.message === 'No Living connections') {
          throw new Error('Is the Elasticsearch server running?');
        } else {
          throw err;
        }
      });
    }
  });
};
