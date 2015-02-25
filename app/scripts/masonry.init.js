'use strict';

// Initiate masonry & infinite scroll on relevant pages
$(function() {

	var $container = $('#masonry-container');

	$container.imagesLoaded(function(){
		var masonry = new Masonry( $container.get(0), {
			itemSelector: '.box'
		});
		$container.data('masonry', masonry);
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
		function( newElements ) {
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
		}
	);

	$(window).unbind('.infscr');

	$("#more").click(function(){
			$('#more').hide();
			var $container = $('#masonry-container');
			$container.infinitescroll('retrieve');
			return false;
	});

});
