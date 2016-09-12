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

  var elasticsearchQueryBody = require('es-query-body');

  var searchParams = getSearchParams();

  var queryBody = elasticsearchQueryBody({
    filters: searchParams.filters
  });

  es.search({
    q: searchParams.q,
    index: config.es.assetsIndex,
    body: queryBody,
    size: 24
  }).then(function (response) {
    console.log('response:', response);
    response.hits.hits.forEach(function(asset) {
      var markup = templates.searchResultAsset({
        asset: asset._source
      });
      $results.append(markup);
    });
  }, function (error) {
    console.trace(error.message);
  });

  if(config.features.filterSidebar) {
    var elasticsearchAggregationsBody = require('es-aggregations-body');

    es.search({
      q: searchParams.q,
      index: config.es.assetsIndex,
      body: elasticsearchAggregationsBody({
        filters: searchParams.filters
      }, queryBody),
      size:0
    }).then(function (response) {
      console.log('response:', response);
      response.hits.hits.forEach(function(asset) {
        var markup = templates.searchResultAsset({
          asset: asset._source
        });
        $results.append(markup);
      });

      var sidebar = require('search-filter-sidebar');
      sidebar.update(response.aggregations, searchParams.filters);
    }, function (error) {
      console.trace(error.message);
    });
  }
}
