
module.exports = function(parameters) {
  var result = {};
  var query = {};

  if(parameters.filters.district) {
    query.terms = {
      'district.raw': parameters.filters.district
    };
  }

  if(Object.keys(query).length > 0) {
    result.query = query;
  }

  return result;
};
