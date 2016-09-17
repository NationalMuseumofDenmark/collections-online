/* global config */

/**
 * This module generates queries that can be sent to elastic search
 * TODO: Move everything that is specific to the field names configurable
 */

module.exports = function(parameters) {
  var result = {};
  var query = {};
  var queries = [];

  // TODO: Fix the issues that happens when ?q is sat

  if(parameters.filters.district) {
    queries.push({
      terms: {
        'district.raw': parameters.filters.district
      }
    });
  }

  if(parameters.filters.street_name) {
    queries.push({
      terms: {
        'street_name.raw': parameters.filters.street_name
      }
    });
  }

  if(parameters.filters.freetext) {
    queries.push({
      match: {
        '_all': parameters.filters.freetext.join(' ')
      }
    });
  }

  if(queries.length > 0) {
    query.bool = {
      must: queries
    };
  }

  if(parameters.sorting) {
    var sortOption = config.sortOptions[parameters.sorting];
    result.sort = sortOption.method;
  }

  if(Object.keys(query).length > 0) {
    result.query = query;
  }

  return result;
};
