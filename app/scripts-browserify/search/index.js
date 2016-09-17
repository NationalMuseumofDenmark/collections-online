/* global config */

var getSearchParams = require('./get-parameters');
var elasticsearchQueryBody = require('./es-query-body');
var elasticsearchAggregationsBody = require('./es-aggregations-body');
var generateQuerystring = require('./generate-querystring');

// How many assets should be loaded at once?
const PAGE_SIZE = 24;
module.exports.PAGE_SIZE = PAGE_SIZE;

var resultsDesired = PAGE_SIZE;
var resultsLoaded = 0;
var resultsTotal = Number.MAX_SAFE_INTEGER;
var loadingResults = false;

var templates = {
  searchResultAsset: require('views/includes/search-result-asset'),
  resultsHeader: require('views/includes/results-header'),
};

// We have to listen to #sidebar since the other elements doesn't exist at
// $documentready
function initialize() {
  var $results = $('#results');
  var $resultsHeader = $('#results-header');
  // Update the freetext search input
  var $searchInput = $('#search-input');
  var $loadMoreBtn = $('#load-more-btn');

  function reset() {
    resultsLoaded = 0;
    resultsTotal = Number.MAX_SAFE_INTEGER;
    resultsDesired = PAGE_SIZE;
    $(window).off('scroll');
    $loadMoreBtn.addClass('invisible');
  }

  function update() {
    var searchParams = getSearchParams();
    var freetext = searchParams.filters.freetext ?
                   searchParams.filters.freetext.join(' ') :
                   '';
    $searchInput.val(freetext);
    loadingResults = true;

    if(resultsLoaded >= resultsDesired || resultsLoaded >= resultsTotal) {
      // We've loaded enough
      return;
    }

    // A fresh update is the first of potentially many updates with the same
    // search parameters.
    var freshUpdate = resultsLoaded === 0;

    // Get actual results from the index
    es.search({
      index: config.es.assetsIndex,
      body: elasticsearchQueryBody(searchParams, true),
      from: resultsLoaded,
      size: resultsDesired - resultsLoaded
    }).then(function (response) {
      // If no results are loaded yet, it might be because we just called reset
      if(freshUpdate) {
        // Remove all boxes (search results) from $results, that might be there
        $results.find('.box').remove();
      }
      resultsTotal = response.hits.total;
      loadingResults = false;
      response.hits.hits.forEach(function(asset) {
        var markup = templates.searchResultAsset({
          asset: asset._source,
          index: resultsLoaded
        });
        $results.append(markup);
        resultsLoaded++;
      });

      // If we have not loaded all available results, let's show the btn to load
      if(freshUpdate && resultsLoaded < resultsTotal) {
        $loadMoreBtn.removeClass('invisible');
      } else {
        $loadMoreBtn.addClass('invisible');
      }

      // Update the results header
      if(freshUpdate) {
        $resultsHeader.html(templates.resultsHeader({
          filters: searchParams.filters,
          sorting: searchParams.sorting,
          sortOptions: config.sortOptions,
          result: {
            totalCount: response.hits.total
          }
        }));
      }
    }, function (error) {
      console.trace(error.message);
    });

    if(config.features.filterSidebar) {
      // Get aggragations for the sidebar
      es.search({
        index: config.es.assetsIndex,
        body: elasticsearchAggregationsBody(searchParams),
        size: 0
      }).then(function (response) {
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
      reset();
      history.pushState({}, '', location.pathname + qs);
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
        filters[field] = filters[field].filter(function(v) {
          return v !== value;
        });
        changeSearchParams(searchParams);
      }
    });
  }

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

    $('.search-filter-sidebar__filters').removeClass(visibleClass);
    $('[data-action="show-filters"]').removeClass('expanded');

    if (!wasExpanded) {
      $(this).addClass('expanded');
      $filterSection.addClass(visibleClass);
    }
  });

  $searchInput.closest('form').submit(function(e) {
    e.preventDefault();
    var $form = $(this);
    var freetext = $searchInput.val() || '';
    var searchParams = getSearchParams();
    searchParams.filters.freetext = freetext.split(' ');
    changeSearchParams(searchParams);
  });
}

// If the path is right - let's initialize
if(decodeURIComponent(location.pathname) === '/' + config.searchPath) {
  $(initialize);
}
