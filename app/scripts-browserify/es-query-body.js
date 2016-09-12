
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

  if(parameters.q) {
    queries.push({
      match: {
        '_all': parameters.q
      }
    });
  }

  if(queries.length > 0) {
    query.bool = {
      must: queries
    };
  }

  if(Object.keys(query).length > 0) {
    result.query = query;
  }

  return result;
};
