var getSearchParams = require('get-search-parameters');
var elasticsearchQueryBody = require('es-query-body');
var elasticsearchAggregationsBody = require('es-aggregations-body');
var generateQuerystring = require('generate-search-querystring');

function update() {
  var $results = $('#results');

  var searchParams = getSearchParams();
  console.log('searchParams before', searchParams);

  var queryBody = elasticsearchQueryBody(searchParams);

  // Get actual results from the index
  es.search({
    index: config.es.assetsIndex,
    body: queryBody,
    size: 24
  }).then(function (response) {
    $results.empty();
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
    // Get aggragations for the sidebar
    es.search({
      index: config.es.assetsIndex,
      body: elasticsearchAggregationsBody(searchParams),
      size:0
    }).then(function (response) {
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

function changeFilters(filters) {
  var searchParams = getSearchParams();
  searchParams.filters = filters;
  // Change the URL
  if(history) {
    var qs = generateQuerystring(searchParams);
    history.pushState({}, '', location.pathname + qs);
  } else {
    throw new Error('History API is required');
  }
  // TODO: Consider moving this to an event listener
  update();
}

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

  update();
  // When the user navigates the state, update it
  window.addEventListener('popstate', function(event) {
    update();
  }, false);

  $(function() {
    $('#sidebar').on('click', 'button', function(e) {
      var action = $(this).data('action');
      var field = $(this).data('field');
      var value = $(this).data('value');
      var filters = getSearchParams().filters;
      if(action === 'add-filter') {
        console.log('Adding ', field, 'value', value);
        if(typeof(filters[field]) === 'object') {
          filters[field].push(value);
        } else {
          filters[field] = [value];
        }
        changeFilters(filters);
      } else if(action === 'remove-filter') {
        console.log('Removing ', field, 'value', value);
        filters[field] = filters[field].filter(function(v) {
          return v !== value;
        });
        changeFilters(filters);
      }
    });
  });

}