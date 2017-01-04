'use strict';

var elasticsearch = require('elasticsearch');
var config = require('../config');
var Q = require('q');
var Agent = require('agentkeepalive');

// TODO: Consider injecting the index: config.es.index on every call

var es = new elasticsearch.Client({
  host: config.es.host,
  createNodeAgent(connection, config) {
    return new Agent(connection.makeAgentConfig(config));
  }
});

const indecies = Object.keys(config.types).map((type) => {
  return config.types[type].index;
});

function injectIndex(originalMethod) {
  const originalBoundMethod = originalMethod.bind(es);
  return function(body) {
    if(!body.index && config.es && config.es.index) {
      body.index = config.es.index;
    }
    return originalBoundMethod(body);
  };
}

es.count = injectIndex(es.count);
es.getSource = injectIndex(es.getSource);
es.mget = injectIndex(es.mget);
es.search = injectIndex(es.search);

es.scrollSearch = function(body, hitCallback) {
  return this.search({
    index: indecies,
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
        return es.scroll({
          scrollId: scrollId,
          scroll: '30s'
        }).then(getMoreUntilDone);
      });
    }
  });
};

module.exports = es;
