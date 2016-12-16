const config = require('collections-online/shared/config');

/**
 * This module handles the rendering of the search filter sidebar.
 */

var template = require('views/includes/search-filter-sidebar');

/**
 * Updates the search filter sidebar based on the selected and available filters
 */
exports.update = function(aggregations, filters) {
  var $sidebar = $('#sidebar');
  var filterCount = 0;
  Object.keys(filters).forEach(function(field) {
    filterCount += filters[field].length;
  });
  // Go though the aggregations and remove all buckets with no documents
  Object.keys(aggregations).forEach(function(a) {
    var filteredAggregation = aggregations[a];
    Object.keys(filteredAggregation).forEach(function(field) {
      var aggregation = filteredAggregation[field];
      if(aggregation.buckets) {
        aggregation.buckets = Object.keys(aggregation.buckets)
        .map(function(b) {
          var bucket = aggregation.buckets[b];
          bucket.key = bucket.key || b; // Fallback to the objects key
          return bucket;
        }).filter(function(bucket) {
          return bucket.doc_count > 0;
        });
      }
    });
  });
  var filterLabels = {};
  Object.keys(config.search.filters).forEach(function(field) {
    var filter = config.search.filters[field];
    if(filter.type !== 'querystring') {
      filterLabels[field] = filter;
    }
  });
  // Render the markup
  var markup = template({
    aggregations: aggregations,
    filters: filters,
    filterCount: filterCount,
    filterLabels: filterLabels
  });
  $sidebar.html(markup);
};
