
module.exports = function(parameters) {
  return {
    query: {
      match: parameters.filters
    },
    aggs: {
      district: {
        terms: {
          field: 'district.raw',
          size: 40
        }
      }
    }
  };
};
