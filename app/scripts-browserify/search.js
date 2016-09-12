/* global config */
if(config.features.clientSideSearchResultRendering) {
  var elasticsearch = require('elasticsearch');
  var es = new elasticsearch.Client({
    host: location.origin + '/es',
    log: config.es.log
  });

  es.search({
    q: 'hestevogne',
    index: config.es.assetsIndex
  }).then(function (body) {
    console.log('Hits!', body.hits.hits);
  }, function (error) {
    console.trace(error.message);
  });

  if(config.features.searchFilterSidebar) {
    var templates = {
      searchFilterSidebar: require('views/includes/search-filter-sidebar')
    };

    var hest = templates.searchFilterSidebar();
    console.log('Hest:', hest);

  }
}
