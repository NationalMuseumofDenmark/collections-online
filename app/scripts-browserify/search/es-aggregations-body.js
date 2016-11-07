/* global config */

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
    var to = y + 100;
    result.push({
      from: from.toString(),
      to: to.toString() + '||-1s'
    });
  }
  // Every ten years
  var lastYear;
  for(var y = 1900; y < CREATION_INTERVAL_TO; y+= 10) {
    var from = y;
    var to = y + 10;
    lastYear = to;
    result.push({
      from: from.toString(),
      to: to.toString() + '||-1s'
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
    aggs: {}
  };

  Object.keys(config.search.filters).forEach(function(field) {
    var filter = config.search.filters[field];
    var aggs = {};
    if(filter.type === 'term') {
      aggs[field] = {
        terms: {
          field: filter.field,
          size: filter.size || 2147483647 // Basically any possible value
        }
      };
    } else if(filter.type === 'date-range') {
      // Tried the date histogram /w interval: '3650d' // Not really 10 years
      // See https://github.com/elastic/elasticsearch/issues/8939
      aggs[field] = {
        date_range: {
          field: filter.field,
          format: 'yyy',
          ranges: generateDateRanges()
        }
      };
    }
    result.aggs[field + '_independent'] = {
      filter: buildFilter(parameters, field),
      aggs: aggs
    };
  });

  return result;
};



// TODO make it work by including the right stuff as defined in asset-section.js
// and asset-layout.json
