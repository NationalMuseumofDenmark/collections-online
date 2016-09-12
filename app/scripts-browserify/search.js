var getSearchParams = require('get-search-parameters');

/* global config */
if(config.features.clientSideSearchResultRendering) {

  var templates = {
    searchResultAsset: require('views/includes/search-result-asset'),
  };

  var elasticsearch = require('elasticsearch');
  var es = new elasticsearch.Client({
    host: location.origin + '/es',
    log: config.es.log
  });

  var $results = $('#results');

  var elasticsearchBody = require('elasticsearch-body');

  es.search({
    q: getSearchParams().q,
    index: config.es.assetsIndex,
    body: elasticsearchBody({
      filters: {
        city: 'København'
      }
    }),
    size: 24
  }).then(function (response) {
    console.log('response:', response);
    response.hits.hits.forEach(function(asset) {
      var markup = templates.searchResultAsset({
        asset: asset._source
      });
      $results.append(markup);
    });

    if(config.features.filterSidebar) {
      var sidebar = require('search-filter-sidebar');
      sidebar.update(response.aggregations, {
        district: ['Østerbro']
      });
    }
  }, function (error) {
    console.trace(error.message);
  });
}
