'use strict';

// Initiate masonry & infinite scroll on relevant pages
$(function() {
  var $searchResult = $('#masonry-container');
  var noMore = 'Ikke flere poster';

  // Replaces the current state in history with one that includes the
  function storeSearchResultInHistoryState(currentSearchResultPage) {
    // Change the history entry to carry the search result and page count.
    if (history && history.replaceState) {
      // We need to clone this, for the reset of css to not affect the dom.
      var $searchResultClone = $searchResult.clone();
      // Reset the CSS position, left and top properties.
      $searchResultClone.children().each(function() {
        $(this).css({
          position: '',
          left: '',
          top: ''
        });
      });
      var state = history.state || {};
      state.page = currentSearchResultPage;
      state.searchResult = $searchResultClone.html();

      history.replaceState(state, document.title);
    }
  }

  // Replaces the current state in history with one that includes the vertical
  // scroll offset. This is needed because we cannot rely on the browsers
  // implementation of scrolling down the page when navigating back in history.
  // The reason for this is probably that we load the images after the
  // window.load event fires.
  function storeScrollOffsetInHistoryState() {
    // Change the history entry to carry the search result and page count.
    if (history && history.replaceState) {
      var state = history.state || {};
      state.scrollTop = $(window).scrollTop();

      // If the search result has not yet been stored in the state.
      if (!state.searchResult) {
        // Let's assume that we're on the first page of the infinitescroll.
        storeSearchResultInHistoryState(1);
      }

      history.replaceState(state, document.title);
    }
  }

  // This method replaces the search result with one loaded from the
  // history state.
  function replaceSearchResult(searchResult, page, scrollTop) {
    if (searchResult) {
      $searchResult
        .empty()
        .html(searchResult)
        .children()
        .css('opacity', 0);

      // Tell masonry to reorganise the results.
      $searchResult.imagesLoaded(function() {
        var masonry = new Masonry($searchResult.get(0), {
          itemSelector: '.box',
          transitionDuration: 0
        });
        $searchResult.data('masonry', masonry);
        // Show the search results when they have been rearranged.
        $searchResult.children().css('opacity', 1);
        // Tell the browser to scroll down.
        if (scrollTop) {
          $(window).scrollTop(scrollTop);
        }
      });

      if (page) {
        // Make sure to change the infinitescroll page.
        $searchResult.infinitescroll('update', {
          state: {
            currPage: page
          }
        });
      }
    }
  }

  // If we are on the seach result page.
  var onSearchResultPage = $searchResult.hasClass('search-results');
  if (onSearchResultPage) {
    $searchResult.infinitescroll({
      navSelector: '#page-nav', // selector for the paged navigation
      nextSelector: '#page-nav a', // selector for the NEXT link (to page 2)
      itemSelector: '.box', // selector for all items you'll retrieve
      loading: {
        msg: $('<span></span>'),
        speed: 0
      },
      animate: false,
      errorCallback: function(selector, msg) {
        $('[data-action=load-more]').removeClass('loading')
          .children('.text').html(noMore);
      }
    },

    // trigger Masonry as a callback
    function(newElements, opts) {
      var $newElements = $(newElements);
      // Set this variable to be used when the user clicks a link.
      storeSearchResultInHistoryState(opts.state.currPage);
      // hide new items while they are loading
      // ensure that images load before adding to masonry layout
      $newElements.imagesLoaded(function() {
        var masonry = $searchResult.data('masonry');
        masonry.appended($newElements, true);
        $('[data-action=load-more]').removeClass('disabled loading');
      });
    });

    // Window.popstate is not reliable
    if (history && history.state && history.state.searchResult) {
      replaceSearchResult(history.state.searchResult,
        history.state.page,
        history.state.scrollTop);
    } else {
      // We do not have a history object with a state - let's just initialize
      // Masonry when the images have all loaded.
      $searchResult.imagesLoaded(function() {
        $searchResult.each(function() {
          var masonry = new Masonry(this, {
            itemSelector: '.box',
            transitionDuration: 0
          });
          $searchResult.data('masonry', masonry);
        });
      });
    }

    /*
    // TODO: Find a less intrusive method - possibly storing the offset at
    // the event of the user navigating away (either as an event fired by the
    // history API or some click event on links).
    $(window).on('scroll', function() {
        // Store the window's vertical offset in the state.
        storeScrollOffsetInHistoryState();
    })
    */
    window.onbeforeunload = function() {
      storeScrollOffsetInHistoryState();
    };

    // We are not interested in the infinite scrolling working automatically.
    $searchResult.infinitescroll('unbind');

    $('[data-action=load-more]').click(function() {
      $(this).addClass('disabled loading');
      var $searchResult = $('#masonry-container');
      $searchResult.infinitescroll('retrieve');
      return false;
    });
  }

});
