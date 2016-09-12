var template = require('views/includes/search-filter-sidebar');
//var qs = require('querystring');

/**
 * Looks at the location and updates the search filter sidebar
 */
exports.update = function(aggregations, filters) {
  var $sidebar = $('#sidebar');
  var markup = template({
    aggregations: aggregations,
    filters: filters
  });
  $sidebar.html(markup);
};
