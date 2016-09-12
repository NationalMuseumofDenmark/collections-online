/* global config */
if(config.features.clientSideSearchResultRendering) {

  var templates = {
    searchFilterSidebar: require('views/includes/search-filter-sidebar'),
    searchResultAsset: require('views/includes/search-result-asset')
  };
  var elasticsearch = require('elasticsearch');
  var es = new elasticsearch.Client({
    host: location.origin + '/es',
    log: config.es.log
  });

  var $results = $('#results');

  es.search({
    q: 'hestevogne',
    index: config.es.assetsIndex,
    size: 24
  }).then(function (body) {
    body.hits.hits.forEach(function(asset) {
      var markup = templates.searchResultAsset({
        asset: asset._source
      });
      $results.append(markup);
    });
  }, function (error) {
    console.trace(error.message);
  });

  /*
  if(config.features.searchFilterSidebar) {

    var hest = templates.searchFilterSidebar();
    console.log('Hest:', hest);

  }
  */
}
