/* global config */

/**
 * This module generates queries that can be sent to elastic search
 * TODO: Move everything that is specific to the field names configurable
 */

module.exports = function(parameters) {
  var result = {};
  var query = {};

  // Start with a query that selects only the searchable results
  var queries = [
    {match: {'is_searchable': true}}
  ];

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

  if(parameters.filters.original_material) {
    queries.push({
      terms: {
        'original_material.displaystring': parameters.filters.original_material
      }
    });
  }

  if(parameters.filters.license) {
    queries.push({
      terms: {
        'license.displaystring': parameters.filters.license
      }
    });
  }

  if(parameters.filters.institution) {
    queries.push({
      terms: {
        'institution.raw': parameters.filters.institution
      }
    });
  }

  if(parameters.filters.creation) {
    var creationQueries = parameters.filters.creation.map(function(interval) {
      var intervalSplit = interval.split('-');
      var range = {
        format: 'yyy'
      };
      if(intervalSplit[0] && intervalSplit[0] !== '*') {
        range.gte = intervalSplit[0];
      }
      if(intervalSplit[1] && intervalSplit[1] !== '*') {
        // intervalSplit[1] might be 1919
        // Let's ask for dates less than the year+1, because as '1919-02-01'
        // is not less than or equal to 1919=1919-01-01.
        range.lt = (parseInt(intervalSplit[1], 10) + 1).toString();
      }
      return {
        range: {
          'creation_time.timestamp': range
        }
      };
    });

    queries.push({
      bool: {
        should: creationQueries
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
