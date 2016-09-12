'use strict';

/**
 * This initializes the ElasticSearch index.
 *
 * @param {Object} state The state of which we are about to initialize.
 */

var es = require('../../lib/services/elasticsearch');
var config = require('../../lib/config');

module.exports = function(state) {
  state.index = config.es.assetsIndex;
  console.log('Initializing the Elastic Search index: ' + state.index);

  return es.indices.exists({
    index: state.index
  }).then(function(exists) {
    if (exists) {
      console.log('Index was already created');
      return state;
    } else {
      var fields = {
        'short_title': {
          'type': 'string',
          'analyzer': 'english',
          'fields': {
            'raw': {
              'type': 'string',
              'index': 'not_analyzed'
            }
          }
        }
      };
      // Derive mappings from the asset field types
      // First the fields with date types
      config.assetFields.filter((field) => {
        return field.type === 'date';
      }).forEach((field) => {
        var fieldName = field.short;
        fields[fieldName] = {
          type: 'object',
          properties: {
            timestamp: {type: 'date'}
          }
        };
      });
      // Create the actual index
      return es.indices.create({
        index: state.index,
        body: {
          'index': {
            'max_result_window': 100000 // So sitemaps can access all assets
          },
          'mappings': {
            'asset': {
              'properties': fields
            }
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
