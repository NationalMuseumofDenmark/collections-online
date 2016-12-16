'use strict';

const ds = require('../services/documents');
const config = require('../config');
const types = Object.keys(config.types);

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

exports.json = (req, type) => {
  var collection = req.params.collection;
  var id = req.params.id;
  return ds.getSource({
    type: type,
    id: collection + '-' + id
  });
};
