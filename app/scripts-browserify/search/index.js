/* global config */

var getSearchParams = require('./get-parameters');
var elasticsearchQueryBody = require('./es-query-body');
var elasticsearchAggregationsBody = require('./es-aggregations-body');
var generateQuerystring = require('./generate-querystring');

var templates = {
  searchResultAsset: require('views/includes/search-result-asset'),
  resultsHeader: require('views/includes/results-header'),
};

function update() {
  var $results = $('#results');
  var $resultsHeader = $('#results-header');

  var searchParams = getSearchParams();

  // Update the freetext search input
  var $searchInput = $('#search-input');
  var freetext = searchParams.filters.freetext ?
                 searchParams.filters.freetext.join(' ') :
                 '';
  $searchInput.val(freetext);

  // Get actual results from the index
  es.search({
    index: config.es.assetsIndex,
    body: elasticsearchQueryBody(searchParams, true),
    size: 24
  }).then(function (response) {
    $results.empty();
    response.hits.hits.forEach(function(asset) {
      var markup = templates.searchResultAsset({
        asset: asset._source
      });
      $results.append(markup);
    });
    $resultsHeader.html(templates.resultsHeader({
      filters: searchParams.filters,
      sorting: searchParams.sort,
      sortOptions: config.sortOptions,
      result: {
        totalCount: response.hits.total
      }
    }));
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

      var sidebar = require('./filter-sidebar');
      sidebar.update(response.aggregations, searchParams.filters);
    }, function (error) {
      console.trace(error.message);
    });
  }
}

function changeSearchParams(searchParams) {
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

if(config.features.clientSideSearchResultRendering) {

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
      var searchParams = getSearchParams();
      var filters = searchParams.filters;
      if(action === 'add-filter') {
        console.log('Adding ', field, 'value', value);
        if(typeof(filters[field]) === 'object') {
          filters[field].push(value);
        } else {
          filters[field] = [value];
        }
        changeSearchParams(searchParams);
      } else if(action === 'remove-filter') {
        console.log('Removing ', field, 'value', value);
        filters[field] = filters[field].filter(function(v) {
          return v !== value;
        });
        changeSearchParams(searchParams);
      }
    });
  });

  $('#results-header').on('click', '#sorting .dropdown__options a', function() {
    var sorting = $(this).data('value');
    var searchParams = getSearchParams();
    searchParams.sort = sorting;
    changeSearchParams(searchParams);
  });

}
