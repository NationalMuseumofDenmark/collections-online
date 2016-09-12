/* global config */
if(config.features.clientSideSearchResultRendering) {
  var templates = {
    searchFilterSidebar: require('views/includes/search-filter-sidebar')
  };

  var hest = templates.searchFilterSidebar();
  console.log('Hest:', hest);

  
}
