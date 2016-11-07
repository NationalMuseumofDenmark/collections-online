/* global config */

/**
 * This module generates queries that can be sent to elastic search
 * TODO: Move everything that is specific to the field names configurable
 */

module.exports = function(parameters) {
  var result = {};
  var query = {};

  var queries = [];

  // Start with any base query specified in the config
  if(config.search.baseQuery) {
    queries.push(config.search.baseQuery);
  }

  Object.keys(parameters.filters).forEach(function(field) {
    var filter = config.search.filters[field];
    if(filter) {
      if(filter.type === 'term') {
        var query = {
          terms: {}
        };
        query.terms[filter.field] = parameters.filters[field];
        queries.push(query);
      } else if(filter.type === 'date-range') {
        var intervalQueries = parameters.filters[field].map(function(interval) {
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
          var query = {
            range: {}
          };
          query.range[filter.field] = range;
          return query;
        });

        queries.push({
          bool: {
            should: intervalQueries
          }
        });
      } else if(filter.type === 'querystring') {
        if(parameters.filters[field]) {
          queries.push({
            'query_string': {
              'query': parameters.filters[field],
              'default_operator': 'OR'
            }
          });
        }
      }
    } else {
      console.error('Requested filtering on an unexpected field: ', field);
    }
  });

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
