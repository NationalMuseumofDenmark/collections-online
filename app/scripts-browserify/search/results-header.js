const config = require('collections-online/shared/config');

/**
 * This module handles the rendering of the results header
 */

var template = require('views/includes/search-results-header');

/**
 * Updates the search filter sidebar based on the selected and available filters
 */
exports.update = function(searchParams, totalCount) {
  const $resultsHeader = $('#results-header');
  // Render the markup
  const markup = template({
    isFiltered: Object.keys(searchParams.filters).length > 0,
    result: {
      totalCount
    },
    sorting: searchParams.sorting,
    sortOptions: config.sortOptions
  });
  // Replace the HTML with the newly rendered markup
  $resultsHeader.html(markup);
};
