'use strict';

module.exports = {
  type: 'document-service',
  module: require('../lib/services/elasticsearch'),
  initialize: () => {
    // TODO: Test the configuration and print the document count
  }
};
