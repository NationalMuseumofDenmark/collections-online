/**
 * This module generates queries that can be sent to elastic search to get the
 * aggregations that are used for filter buttons.
 * TODO: Move everything that is specific to the field names configurable
 */

var elasticsearchQueryBody = require('./es-query-body');

const CREATION_INTERVAL_FROM = 1000; // Year 1000
const CREATION_INTERVAL_TO = (new Date()).getFullYear(); // Current year

function buildFilter(parameters, field) {
  var independentFilters = {};
  Object.keys(parameters.filters).forEach(function(f) {
    if(f !== field) {
      independentFilters[f] = parameters.filters[f];
    }
  });
  var independentParameters = {
    filters: independentFilters
  };
  return elasticsearchQueryBody(independentParameters);
}

function generateDateRanges() {
  // Let's have a bucket for all things before the intervals
  var result = [
    {to: CREATION_INTERVAL_FROM.toString()}
  ];
  // Every houndred years
  for(var y = CREATION_INTERVAL_FROM; y < 1900; y+= 100) {
    var from = y;
    var to = y + 99;
    result.push({
      from: from.toString(),
      to: to.toString()
    });
  }
  // Every ten years
  var lastYear;
  for(var y = 1900; y < CREATION_INTERVAL_TO; y+= 10) {
    var from = y;
    var to = y + 9;
    lastYear = to;
    result.push({
      from: from.toString(),
      to: to.toString()
    });
  }
  // And beyound
  result.push({
    from: lastYear.toString()
  });
  return result;
}

module.exports = function(parameters, body) {
  var result = {
    aggs: {
      district_independent: {
        filter: buildFilter(parameters, 'district'),
        aggs: {
          district: {
            terms: {
              field: 'district.raw',
              size: 100 // All basicly
            }
          }
        }
      },
      street_name_independent: {
        filter: buildFilter(parameters, 'street_name'),
        aggs: {
          street_name: {
            terms: {
              field: 'street_name.raw',
              size: 5
            }
          }
        }
      },
      creation_independent: {
        filter: buildFilter(parameters, 'creation'),
        aggs: {
          creation: {
            date_range: {
              field: 'creation_time.timestamp',
              format: 'yyy',
              ranges: generateDateRanges()
            }
          }
        }
      }
    }
  };

  // Tried the date histogram /w interval: '3650d' // Not really 10 years
  // See https://github.com/elastic/elasticsearch/issues/8939

  return result;
};
