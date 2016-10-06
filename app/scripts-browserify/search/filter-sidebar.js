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
        aggregation.buckets = aggregation.buckets.filter(function(bucket) {
          return bucket.doc_count > 0;
        });
      }
    });
  });
  // Render the markup
  var markup = template({
    aggregations: aggregations,
    filters: filters,
    filterCount: filterCount,
    filterLabels: {
      'district': 'bydele',
      'street_name': 'vejnavne',
      'creation': 'perioder',
      'original_material': 'originalmaterialer',
      'license': 'licenser',
      'institution': 'institutioner'
    }
  });
  $sidebar.html(markup);
};
