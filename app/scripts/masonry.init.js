'use strict';

// Initiate masonry & infinite scroll on relevant pages
$(function() {

	var $container = $('#masonry-container');

	// Replaces the current state in history with one that includes the 
	function storeSearchResultInHistoryState(currentSearchResultPage) {
		// Change the history entry to carry the search result and page count.
		if(history && history.replaceState) {
			// We need to clone this, for the reset of css to not affect the dom.
			var $searchResult = $container.clone();
			// Reset the CSS position, left and top properties.
			$searchResult.children().each(function() {
				$(this).css({
					position: '',
					left: '',
					top: ''
				});
			});
			var state = history.state;
			state.page = currentSearchResultPage;
			state.searchResult = $searchResult.html();

			history.replaceState(state, document.title, '');
		}
	}

	// Replaces the current state in history with one that includes the vertical
	// scroll offset. This is needed because we cannot rely on the browsers
	// implementation of scrolling down the page when navigating back in history.
	// The reason for this is probably that we load the images after the 
	// window.load event fires.
	function storeScrollOffsetInHistoryState() {
		// Change the history entry to carry the search result and page count.
		if(history && history.replaceState) {
			var state = history.state;
			state.scrollTop = $(window).scrollTop();
			
			history.replaceState(state, document.title, '');
		}
	}

	// This method replaces the search result with one loaded from the
	// history state.
	function replaceSearchResult(page, searchResult, scrollTop) {
		if(page) {
			// Make sure to change the infinitescroll page.
			$container.infinitescroll('update', {state: {currPage: page}});
		}

		if(searchResult) {
			$container
				.empty()
				.html(searchResult)
				.children()
				.css({ opacity: 0 });

			// Tell masonry to reorganise the results.
			$container.imagesLoaded(function() {
				/*
				// Destroy and recreate the masonry plugin.
				var masonry = $container.data('masonry');
				masonry.destroy();
				*/
				var masonry = new Masonry( $container.get(0), {
					itemSelector: '.box'
				} );
				$container.data('masonry', masonry);
				// Show the search results when they have been rearranged.
				$container
					.children()
					.css({ opacity: 1 });
				// Tell the browser to scroll down.
				if(scrollTop) {
					$(window).scrollTop(scrollTop);
				}
			});
		}
	}

	// Window.popstate is not reliable
	if(history && history.state) {
		replaceSearchResult(history.state.page,
		                    history.state.searchResult,
		                    history.state.scrollTop);
	} else {
		// We do not have a history object with a state - let's just initialize
		// Masonry when the images have all loaded.
		$container.imagesLoaded(function(){
			$container.each(function() {
				var masonry = new Masonry(this, {
					itemSelector: '.box'
				});
				$container.data('masonry', masonry);
			});
		});
	}

	$container.infinitescroll({
		navSelector  : '#page-nav',    // selector for the paged navigation
		nextSelector : '#page-nav a',  // selector for the NEXT link (to page 2)
		itemSelector : '.box',     // selector for all items you'll retrieve
		loading: {
			finishedMsg: 'Ikke flere resultater...',
			img: '/images/loading.gif',
			msgText: 'Henter flere resultater...',
			speed: 0,
		},
		animate:false
	},
	// trigger Masonry as a callback
	function( newElements, opts ) {
		// Set this variable to be used when the user clicks a link.
		storeSearchResultInHistoryState(opts.state.currPage);
		// hide new items while they are loading
		var $newElems = $( newElements ).css({ opacity: 0 });
		// ensure that images load before adding to masonry layout
		$newElems.imagesLoaded(function(){
			// show elems now they're ready
			$newElems.animate({ opacity: 1 });
			var masonry = $container.data('masonry');
			masonry.appended( $newElems, true );
			$('#more').show();
		});
	});

	$(window).on('scroll', function() {
		// Store the window's vertical offset in the state.
		storeScrollOffsetInHistoryState();
	})

	// We are not interested in the infinite scrolling working automatically.
	$container.infinitescroll('unbind');

	$("#more").click(function(){
			$('#more').hide();
			var $container = $('#masonry-container');
			$container.infinitescroll('retrieve');
			return false;
	});

});
