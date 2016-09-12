
function buildFilter(baseQuery, field) {
  var result = $.extend({}, baseQuery);
  delete result.terms[field];
  // If this was the only field, let's leave out the terms filter entirely
  if(Object.keys(result.terms).length === 0) {
    delete result.terms;
  }
  return result;
}

module.exports = function(parameters, body) {
  var baseQuery = body.query;

  var result = {
    aggs: {
      district_independent: {
        filter: buildFilter(baseQuery, 'district.raw'),
        aggs: {
          district: {
            terms: {
              field: 'district.raw',
              size: 40
            }
          }
        }
      }
    }
  };

  return result;
};
