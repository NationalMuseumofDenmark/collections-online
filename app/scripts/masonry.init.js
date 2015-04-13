'use strict';

// Initiate masonry & infinite scroll on relevant pages
$(function() {

	var $container = $('#masonry-container');

	$container.imagesLoaded(function(){
		$container.each(function() {
			var masonry = new Masonry( this, {
				itemSelector: '.box'
			});
			$container.data('masonry', masonry);
		});
	});

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
		// Change the location hash
		if(history) {
			var state = {
				page: opts.state.currPage,
				search_result: $container.html()
			};
			// Push this state to the history.
			history.replaceState(state);
		}

		// hide new items while they are loading
		var $newElems = $( newElements ).css({ opacity: 0 });
		// ensure that images load before adding to masonry layout
		$newElems.imagesLoaded(function(){
			// show elems now they're ready
			$newElems.animate({ opacity: 1 });
			var masonry = $container.data('masonry');
			masonry.appended( $newElems, true );
			$('', $newElems)
			$('#more').show();
		});
	});

	$(window).unbind('.infscr');

	$("#more").click(function(){
			$('#more').hide();
			var $container = $('#masonry-container');
			$container.infinitescroll('retrieve');
			return false;
	});

	// When navigating back to a search that has already paginated.
	window.onpopstate = function(event) {
		var page = event.state.page;
		var search_result = event.state.search_result;
		// If we have a page and a search result
		if(search_result && page) {
			// Substitude the loaded search result.
			$container.html(search_result);
			// Make sure to change the infinitescroll page.
			$container.infinitescroll('update', {state: {currPage: page}});
		}
	};

});
