'use strict';

module.exports = function(state, metadata) {
  // Transforms the categories.
  if (metadata.categories !== undefined) {
    metadata.categories_int = [];

    for (var j = 0; j < metadata.categories.length; ++j) {
      if (metadata.categories[j].path.indexOf('$Categories') !== 0) {
        continue;
      }
      var category = metadata.categories[j].id;
      var path = state.categories[metadata.catalog].getPath(category);
      if (path) {
        for (var k = 0; k < path.length; k++) {
          metadata.categories_int.push(path[k].id);
          if (path[k].name.indexOf('$Categories') === 0) {
            continue;
          }
        }
      }
    }
  }
  return metadata;
};
