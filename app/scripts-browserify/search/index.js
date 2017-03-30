/**
 * This module handles all clientside searching
 */

const config = require('collections-online/shared/config');
const helpers = require('../../../shared/helpers');

require('./search-freetext-form');

const getSearchParams = require('./get-parameters');
const elasticsearchQueryBody = require('./es-query-body');
const elasticsearchAggregationsBody = require('./es-aggregations-body');
const generateQuerystring = require('./generate-querystring');
const resultsHeader = require('./results-header');

const templates = {
  searchResultItem: require('views/includes/search-results-item')
};

// How many assets should be loaded at once?
const PAGE_SIZE = 24;
module.exports.PAGE_SIZE = PAGE_SIZE;

let resultsDesired = PAGE_SIZE;
let resultsLoaded = [];
let resultsTotal = Number.MAX_SAFE_INTEGER;
let loadingResults = false;

// We have to listen to #sidebar since the other elements doesn't exist at
// $documentready
function initialize() {
  const $searchInput = $('.search-freetext-form__input');
  const $results = $('#results');
  const $loadMoreBtn = $('#load-more-btn');
  const $noResultsText = $('#no-results-text');

  function reset() {
    resultsLoaded = [];
    resultsTotal = Number.MAX_SAFE_INTEGER;
    resultsDesired = PAGE_SIZE;
    $(window).off('scroll');
    $loadMoreBtn.addClass('invisible');
  }

  function update(freshUpdate, indicateLoading) {
    // If the indicateLoading is not set - default to true
    if(typeof(indicateLoading) === 'undefined') {
      indicateLoading = true;
    }
    var searchParams = getSearchParams();
    // Update the freetext search input
    var queryString = searchParams.filters.q;
    $searchInput.val(queryString);
    // Update the page title
    const title = helpers.generateSearchTitle(searchParams.filters);
    $('head title').text(title + ' - ' + config.siteTitle);
    loadingResults = true;

    // A fresh update is the first of potentially many updates with the same
    // search parameters.
    freshUpdate = resultsLoaded.length === 0 || freshUpdate;

    if(freshUpdate) {
      resultsHeader.update(searchParams, resultsTotal);
      if(config.features.filterSidebar) {
        const sidebar = require('./filter-sidebar');
        // Update the sidebar right away
        sidebar.update(searchParams.filters, null);
        // Get aggragations for the sidebar
        es.search({
          body: elasticsearchAggregationsBody(searchParams),
          size: 0
        }).then(function (response) {
          sidebar.update(searchParams.filters, response.aggregations);
        }, function (error) {
          console.trace(error.message);
        });
      }
      // Update the results header before the result comes in
      if(indicateLoading) {
        $('.search-results').addClass('search-results--loading');
      }
    }

    // Get actual results from the index
    // TODO: Could probably be combined with the first es.search request when
    // performing a fresh update.

    // Generate the query body
    let queryBody = elasticsearchQueryBody(searchParams);
    if(typeof(helpers.modifySearchQueryBody) === 'function') {
      // If a modifySearchQueryBody helper is defined, call it
      queryBody = helpers.modifySearchQueryBody(queryBody, searchParams);
    }

    es.search({
      body: queryBody,
      from: resultsLoaded.length,
      size: resultsDesired - resultsLoaded.length
    }).then(function (response) {
      // If no results are loaded yet, it might be because we just called reset
      if(resultsLoaded.length === 0) {
        // Remove all search result items from $results, that might be there
        $results.find('.search-results-item').remove();
      }
      resultsTotal = response.hits.total;
      window.sessionStorage.setItem('lastSearch', JSON.stringify(response.hits));
      loadingResults = false;
      response.hits.hits.forEach(function(hit) {
        const item = {
          type: hit._type,
          metadata: hit._source
        };
        const markup = templates.searchResultItem(item);
        $results.append(markup);
        resultsLoaded.push(item);
      });

      // Replace the state of in the history if supported
      if(history.replaceState) {
        history.replaceState({
          resultsLoaded,
          resultsTotal
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

      // Update the results header with the result
      if(freshUpdate) {
        resultsHeader.update(searchParams, resultsTotal);
        if(indicateLoading) {
          $('.search-results').removeClass('search-results--loading');
        }
      }
    }, function (error) {
      console.trace(error.message);
    });
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
      var $lastResult = $('#results .search-results-item:last-child');
      if($lastResult.length > 0) {
        var lastResultOffset = $lastResult.offset();
        var scrollTop = $(window).scrollTop();
        var scrollBottom = scrollTop + $(window).height();
        if(scrollBottom > lastResultOffset.top && !loadingResults) {
          console.log('Loading more results');
          resultsDesired += PAGE_SIZE;
          update();
        }
      }
    }).scroll();
  }

  function inflateHistoryState(state) {
    // Render results from the state
    if(state.resultsLoaded) {
      reset();
      // Remove all the search result items right away
      $results.find('.search-results-item').remove();
      // Show the button by removing the invisible class
      // $loadMoreBtn.removeClass('invisible');
      // Append rendered markup, once per asset loaded from the state.
      resultsLoaded = state.resultsLoaded;
      resultsDesired = resultsLoaded.length;
      resultsLoaded.forEach(function(item) {
        var markup = templates.searchResultItem(item);
        $results.append(markup);
      });
      // Replace the resultsTotal from the state
      resultsTotal = state.resultsTotal;
      // Using the freshUpdate=true, updates the header as well
      // Using the indicateLoading=false makes sure the UI doesn't blink
      update(true, false);
    }
  }

  var elasticsearch = require('elasticsearch');
  var es = new elasticsearch.Client({
    host: location.origin + '/api'
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

  $('#sidebar').on('click', '.btn', function() {
    var action = $(this).data('action');
    var field = $(this).data('field');
    var filter = config.search.filters[field];
    var value = $(this).data('value');
    if(!value && filter.type === 'date-interval-range') {
      var $form = $(this).closest('.form-group');
      var from = $form.find('[name='+field+'-from]').val() || '*';
      var to = $form.find('[name='+field+'-to]').val() || '*';
      if(from !== '*' || to !== '*') {
        value = from.replace(/-/g, '/') + '-' + to.replace(/-/g, '/');
      } else {
        return;
      }
    }
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
