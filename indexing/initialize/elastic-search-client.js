'use strict';

/**
 * This initializes the ElasticSearch client on the state.
 * @param {Object} state The state of which we are about to initialize.
 */

var elasticsearch = require('elasticsearch');

function elasticSearchClient(state) {
  console.log('Initializing the Elastic Search client');

  state.es = new elasticsearch.Client({
    requestTimeout: 30 * 60 * 1000,
    host: process.env.ES_HOST || 'localhost:9200'
  });
  return state;
}

module.exports = elasticSearchClient;
