'use strict';

var _ = require('lodash');

module.exports = function(state, metadata) {
  // Transforms the categories.
  if (metadata.categories) {
    var categories = state.categories[metadata.catalog];

    var categoryIds = metadata.categories.map((category) => {
      var path = categories.getPath(category.id);
      if (path) {
        return path.map((categoryOnPath) => {
          return categoryOnPath.id;
        });
      }
    });

    metadata.categories_int = _.uniq(_.flatten(categoryIds));
  }
  return metadata;
};
