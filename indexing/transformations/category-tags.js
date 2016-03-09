'use strict';

var _ = require('lodash');
var path = require('path');
var fs = require('fs');

const CONFIG_DIR = path.join(__dirname, '..', '..', 'lib', 'config');
const TAGS_BLACKLIST_PATH = path.join(CONFIG_DIR, 'tags-blacklist.txt');
var tagsBlacklist = fs.readFileSync(TAGS_BLACKLIST_PATH).toString();
// Remove any linebreak from Linux, Windows or Mac and seperate tags
tagsBlacklist = tagsBlacklist.replace(/(\r\n|\n|\r)/gm,'\n').split('\n');

const PREFIXED_NUMBERS_LETTERS_AND_DOTS = /^[\dA-Z\.]+ (- )?/;
const PREFIXED_SPECIAL_CASE_ONE = /^\w+\d\w\s-\s/;

module.exports = function(state, metadata) {
  var tagsPerCategory = metadata.categories.map(function(category) {
    var catalogsCategoryTree = state.categories[metadata.catalog];
    var path = catalogsCategoryTree.getPath(category.id) || [];
    return path.map(function(categoryOnPath) {
      var name = categoryOnPath.name;
      // Categories that starts with the dollar-sign are system categories.
      if (name.indexOf('$') === 0) {
        return null;
      }
      // Remove prefixed numbers, letters and dots.
      name = name.replace(PREFIXED_NUMBERS_LETTERS_AND_DOTS, '');
      // Remove special prefix e.g. "F01a - "
      name = name.replace(PREFIXED_SPECIAL_CASE_ONE, '');
      // We made it this far - let's consider tags lowercase only
      name = name.toLowerCase();
      // Don't include catalogs that are blacklisted.
      if (tagsBlacklist.indexOf(name) !== -1) {
        return null;
      }
      // Let's lower the case.
      return name;
    });
  });

  // Concat all the tags from every path into a single array.
  metadata.tags = _.union.apply(null, tagsPerCategory).filter(function(tag) {
    return !!tag; // Filter out null or undefined values.
  }).sort();

  return metadata;
};
