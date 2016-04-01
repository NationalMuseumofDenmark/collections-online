'use strict';

/**
 * This initializes the ElasticSearch index.
 *
 * @param {Object} state The state of which we are about to initialize.
 */

var es = require('../../lib/services/elasticsearch');
var config = require('../../lib/config/config');

module.exports = function(state) {
  state.index = config.esAssetsIndex;
  console.log('Initializing the Elastic Search index: ' + state.index);

  return es.indices.exists({
    index: state.index
  }).then(function(exists) {
    if (exists) {
      console.log('Index was already created.');
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
      config.assetFields.filter((field) => {
        return field.type;
      }).forEach((field) => {
        var fieldName = field.short;
        if (field.type === 'date') {
          fieldName += '.timestamp';
        }
        fields[fieldName] = {
          type: field.type
        };
      });
      // Create the actual index
      return es.indices.create({
        index: state.index,
        body: {
          'index': {
            'max_result_window': 100000 // We need this, so sitemaps can access all assets
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
