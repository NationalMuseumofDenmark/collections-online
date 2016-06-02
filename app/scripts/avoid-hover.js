'use strict';

// Override default iOS behaviour where you have to click link with hover states
// twice.
// Make sure it only fires on taps and not after dragging

$(function() {
  var dragging = false;
  $('body').on('touchmove', function(){
    dragging = true;
  });
  $('.no-touch-hover').on('touchend', function(e) {
    if (dragging) {
      return;
    }
    var el = $(this);
    var link = el.attr('href');
    window.location = link;
  });
  $('body').on('touchstart', function(){
    dragging = false;
  });
});
