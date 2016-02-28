'use strict';

/**
 * This initializes the ElasticSearch client on the state.
 * @param {Object} state The state of which we are about to initialize.
 */

var elasticsearch = require('elasticsearch'),
    Q = require('q');

module.exports = function(state) {
  console.log('Initializing the Elastic Search client');

  state.es = new elasticsearch.Client({
    requestTimeout: 30 * 60 * 1000,
    host: process.env.ES_HOST || 'localhost:9200'
  });

  // A reusable way to scroll search and sequentially call the hitCallback
  // per document in the index.
  state.es.scrollSearch = function(body, hitCallback) {
    return state.es.search({
      index: state.index,
      scroll: '30s', // Set to 30 seconds because we are calling right back
      size: 1000,
      body: body
    }).then(function getMoreUntilDone(response) {
      // If we are still getting hits - let's iterate over them.
      if (response.hits.hits.length > 0) {
        return response.hits.hits.map(hitCallback).reduce(Q.when, null)
        .then(function() {
          // Next scroll page please.
          var scrollId = response._scroll_id;
          return state.es.scroll({
            scrollId: scrollId,
            scroll: '30s'
          }).then(getMoreUntilDone);
        });
      }
    });
  };

  return state;
};
