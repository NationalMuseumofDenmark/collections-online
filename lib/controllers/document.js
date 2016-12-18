'use strict';

const ds = require('../services/documents');
const config = require('../config');
const types = Object.keys(config.types);
const _ = require('lodash');

if(types.length < 0) {
  throw new Error('Expected at least a one document type to be configured');
}

/**
 * Renders a documents landing page, which exact controller is used is based on
 * the type of then document.
 */
exports.get = (req, type) => {
  var collection = req.params.collection;
  var id = req.params.id;
  return ds.getSource({
    index: config.types[type].index,
    type: type,
    id: collection + '-' + id
  });
};

exports.getRelatedMetadata = (metadata) => {
  let result = {};
  let relatedMetadataPromise = Object.keys(config.types).map(type => {
    const typeKey = type + 's';
    const relatedDocuments = metadata.related[typeKey];
    if(relatedDocuments && relatedDocuments.length > 0) {
      // Create an object that can be used for lookup when merging data
      let relationsMetadata = {};
      relatedDocuments.forEach(doc => {
        relationsMetadata[doc.id] = doc;
      });
      // Request all related documents of the particular type
      return ds.mget({
        type,
        body: {
          ids: relatedDocuments.map(doc => doc.id)
        }
      }).then(response => {
        // Extract the metadata for all related docs that was found
        let docs = response.docs
          .filter(doc => doc.found)
          .map(doc => {
            let id = doc._source.id;
            if(id.indexOf('-') === -1) {
              // Prefix the collection
              id = doc._source.collection + '-' + id;
            }
            let relationMetadata = relationsMetadata[id];
            return _.merge(relationMetadata, doc._source);
          });
        result[typeKey] = docs;
      });
    } else {
      return Promise.resolve([]);
    }
  });
  return Promise.all(relatedMetadataPromise).then(() => {
    return result;
  });
};

exports.json = (req, type) => {
  var collection = req.params.collection;
  var id = req.params.id;
  return ds.getSource({
    type: type,
    id: collection + '-' + id
  });
};
