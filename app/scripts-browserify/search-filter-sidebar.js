var template = require('views/includes/search-filter-sidebar');
//var qs = require('querystring');

/**
 * Looks at the location and updates the search filter sidebar
 */
exports.update = function() {
  var $sidebar = $('#sidebar');
  console.log('Updating sidebar', $sidebar);
  //console.log(qs.parse(location.search));
  var markup = template();
  $sidebar.html(markup);
};
