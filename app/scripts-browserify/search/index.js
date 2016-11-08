/* global config */

/**
 * This module handles all clientside searching
 */

var getSearchParams = require('./get-parameters');
var elasticsearchQueryBody = require('./es-query-body');
var elasticsearchAggregationsBody = require('./es-aggregations-body');
var generateQuerystring = require('./generate-querystring');

// How many assets should be loaded at once?
const PAGE_SIZE = 24;
module.exports.PAGE_SIZE = PAGE_SIZE;

var resultsDesired = PAGE_SIZE;
var resultsLoaded = [];
var resultsTotal = Number.MAX_SAFE_INTEGER;
var loadingResults = false;

var templates = {
  searchResultItem: require('views/includes/search-result-item'),
  resultsHeader: require('views/includes/results-header')
};

// We have to listen to #sidebar since the other elements doesn't exist at
// $documentready
function initialize() {
  var $results = $('#results');
  var $resultsHeader = $('#results-header');
  var $searchInput = $('#search-input');
  var $loadMoreBtn = $('#load-more-btn');
  var $noResultsText = $('#no-results-text');

  function reset() {
    resultsLoaded = [];
    resultsTotal = Number.MAX_SAFE_INTEGER;
    resultsDesired = PAGE_SIZE;
    $(window).off('scroll');
    $loadMoreBtn.addClass('invisible');
  }

  function update(freshUpdate) {
    var searchParams = getSearchParams();
    // Update the freetext search input
    var queryString = searchParams.filters.q;
    $searchInput.val(queryString);
    loadingResults = true;

    // A fresh update is the first of potentially many updates with the same
    // search parameters.
    freshUpdate = resultsLoaded.length === 0 || freshUpdate;

    if(config.features.filterSidebar && freshUpdate) {
      // Get aggragations for the sidebar
      es.search({
        index: 'all', // config.es.assetsIndex,
        body: elasticsearchAggregationsBody(searchParams),
        size: 0
      }).then(function (response) {
        var sidebar = require('./filter-sidebar');
        /*
        if(history.replaceState) {
          history.state.aggregations = response.aggregations;
          history.replaceState(history.state);
        }
        */
        sidebar.update(response.aggregations, searchParams.filters);
      }, function (error) {
        console.trace(error.message);
      }).then(null, console.error);
    }

    // Get actual results from the index
    es.search({
      index: 'all', // config.es.assetsIndex,
      body: elasticsearchQueryBody(searchParams),
      from: resultsLoaded.length,
      size: resultsDesired - resultsLoaded.length
    }).then(function (response) {
      // If no results are loaded yet, it might be because we just called reset
      if(resultsLoaded.length === 0) {
        // Remove all boxes (search results) from $results, that might be there
        $results.find('.box').remove();
      }
      resultsTotal = response.hits.total;
      loadingResults = false;
      response.hits.hits.forEach(function(hit) {
        var item = {
          type: hit._type,
          metadata: hit._source
        };
        var markup = templates.searchResultItem(item);
        $results.append(markup);
        resultsLoaded.push(item);
      });

      // Replace the state of in the history if supported
      if(history.replaceState) {
        history.replaceState({
          resultsLoaded: resultsLoaded
        }, null, null);
      }

      // Show some text if we don't have any results
      if (resultsTotal == 0) {
        $noResultsText.removeClass('hidden');
      } else {
        $noResultsText.addClass('hidden');
      }

      // If we have not loaded all available results, let's show the btn to load
      if(freshUpdate && resultsLoaded.length < resultsTotal) {
        $loadMoreBtn.removeClass('invisible');
      } else {
        $loadMoreBtn.addClass('invisible');
      }

      // Update the results header
      if(freshUpdate) {
        $resultsHeader.html(templates.resultsHeader({
          filters: searchParams.filters,
          isFiltered: Object.keys(searchParams.filters).length > 0,
          sorting: searchParams.sorting,
          sortOptions: config.sortOptions,
          result: {
            totalCount: response.hits.total
          }
        }));
      }
    }, function (error) {
      console.trace(error.message);
    }).then(null, console.error);
  }

  function changeSearchParams(searchParams) {
    // Change the URL
    if(history) {
      var qs = generateQuerystring(searchParams);
      reset();
      history.pushState({
        searchParams: searchParams
      }, '', location.pathname + qs);
      update();
    } else {
      throw new Error('History API is required');
    }
  }

  function enableEndlessScrolling() {
    $loadMoreBtn.addClass('invisible');
    $(window).on('scroll', function(e) {
      var $lastResult = $('#results .box:last-child');
      if($lastResult.length > 0) {
        var lastResultOffset = $lastResult.offset();
        var scrollTop = $(window).scrollTop();
        var scrollBottom = scrollTop + $(window).height();
        if(scrollBottom > lastResultOffset.top && !loadingResults) {
          console.log('Loading more results');
          resultsDesired += PAGE_SIZE;
          update();
        }
        /*
        // Update the location hash
        if(history) {
          // Find the first box that has a top offset below the scrollTop
          var $boxesAboveScroll = $('#results .box').filter(function() {
            return $(this).offset().top < scrollTop;
          });
          history.replaceState(null, null, '#' + $boxesAboveScroll.length);
        }
        */
      }
    }).scroll();
  }

  function inflateHistoryState(state) {
    // Render results from the state
    if(state.resultsLoaded) {
      reset();
      // Remove all the boxes right away
      $results.find('.box').remove();
      // Show the button by removing the invisible class
      // $loadMoreBtn.removeClass('invisible');
      // Append rendered markup, once per asset loaded from the state.
      resultsLoaded = state.resultsLoaded;
      resultsDesired = resultsLoaded.length;
      resultsLoaded.forEach(function(item) {
        var markup = templates.searchResultItem(item);
        $results.append(markup);
      });
      // Using the freshUpdate=true, updates the header as well
      update(true);
    }
  }

  var elasticsearch = require('elasticsearch');
  var es = new elasticsearch.Client({
    host: location.origin + '/api',
    log: config.es.log
  });

  // When the user navigates the state, update it
  window.addEventListener('popstate', function(event) {
    inflateHistoryState(event.state);
  }, false);

  // Update at least once when loading the page
  if(!history.state) {
    update();
  } else {
    inflateHistoryState(history.state);
  }

  $('#sidebar').on('click', '.btn-filter', function() {
    var action = $(this).data('action');
    var field = $(this).data('field');
    var value = $(this).data('value');
    var searchParams = getSearchParams();
    var filters = searchParams.filters;
    if(action === 'add-filter') {
      // console.log('Adding ', field, 'value', value);
      if(typeof(filters[field]) === 'object') {
        filters[field].push(value);
      } else {
        filters[field] = [value];
      }
      changeSearchParams(searchParams);
    } else if(action === 'remove-filter') {
      // console.log('Removing ', field, 'value', value);
      if(typeof(filters[field]) === 'object') {
        filters[field] = filters[field].filter(function(v) {
          return v !== value;
        });
      } else {
        delete filters[field];
      }
      changeSearchParams(searchParams);
    }
  });

  $('#results-header').on('click', '#sorting .dropdown__options a', function() {
    var sorting = $(this).data('value');
    var searchParams = getSearchParams();
    searchParams.sorting = sorting;
    changeSearchParams(searchParams);
  });

  // Enabled the load-more button
  $loadMoreBtn.on('click', function() {
    enableEndlessScrolling();
  });

  // If the location hash is present, the results desired should reflect this
  // and endless scrolling should be enabled
  /*
  if(window.location.hash) {
    var referencedResult = parseInt(window.location.hash.substr(1), 10);
    resultsDesired = referencedResult + PAGE_SIZE;
    enableEndlessScrolling();
    // TODO: Scroll to the referenced result, when done loading
  }
  */

  // Toggle filtersection visibility on mobile
  $('#sidebar').on('click', '[data-action="show-filters"]', function() {
    var filterSection = $(this).data('id') + '-filters';
    var $filterSection = $('[data-id="' + filterSection + '"]');
    var wasExpanded = $(this).hasClass('expanded');
    var visibleClass = 'search-filter-sidebar__filters--expanded';

    if (!wasExpanded) {
      $(this).addClass('expanded');
      $filterSection.addClass(visibleClass);
    } else {
      $(this).removeClass('expanded');
      $filterSection.removeClass(visibleClass);
    }
  });

  $searchInput.closest('form').submit(function(e) {
    e.preventDefault();
    var $form = $(this);
    var queryString = $searchInput.val() || '';
    var searchParams = getSearchParams();
    searchParams.filters.q = queryString;
    changeSearchParams(searchParams);
  });
}

// If the path is right - let's initialize
if(decodeURIComponent(location.pathname) === '/' + config.search.path) {
  $(initialize);
}
