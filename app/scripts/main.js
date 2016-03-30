'use strict';

// Toogle asset images - zome in and out
$(function() {

  var Snackbar = window.Snackbar;
  Snackbar.init();

  var AssetPage = window.AssetPage;
  AssetPage.init();

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


  var hideAllDropdowns = function() {
    $('.dropdown').removeClass('dropdown--active');
    $('body').off('click', hideAllDropdowns);
  };

  $('.dropdown__selected').on('click', function() {
    var $this = $(this);
    var $dropdown = $this.closest('.dropdown');
    if ($dropdown.hasClass('dropdown--active') === false) {
      $dropdown.addClass('dropdown--active');
      setTimeout(function() {
        $('body').off('click', hideAllDropdowns).on('click', hideAllDropdowns);
      }, 1);
    }
  });
});
