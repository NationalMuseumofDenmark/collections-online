'use strict';

// Toogle asset images - zome in and out
$(function() {
  // We only want zooming on asset's primary images.
  $('.asset .zoomable').click(function() {
    var $thisRow = $(this).closest('.image-row');
    if ($thisRow.hasClass('col-md-6')) {
      $thisRow.removeClass('col-md-6').addClass('col-md-12');
      $thisRow.next('div').addClass('col-md-offset-3')
        .removeClass('pull-right');
    } else {
      $thisRow.removeClass('col-md-12').addClass('col-md-6');
      $thisRow.next('div').removeClass('col-md-offset-3')
        .addClass('pull-right');
    }
  });
});

// Scroll to top button
$(function() {
  $('#toTop').scrollToTop(400);
});
