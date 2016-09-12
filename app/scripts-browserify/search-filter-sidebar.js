var template = require('views/includes/search-filter-sidebar');
//var qs = require('querystring');

/**
 * Looks at the location and updates the search filter sidebar
 */
exports.update = function(aggregations, filters) {
  var $sidebar = $('#sidebar');
  var filterCount = 0;
  Object.keys(filters).forEach(function(field) {
    filterCount += filters[field].length;
  });
  var markup = template({
    aggregations: aggregations,
    filters: filters,
    filterCount: filterCount
  });
  $sidebar.html(markup);
};
