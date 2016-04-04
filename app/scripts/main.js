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


  var hideAllDropdowns = function(e) {
    var $target = $(e.target);
    var $dropdown = $target.closest('.dropdown');
    var isInputInDropdown = $target.is('input') || $dropdown.size() > 0;
    if (isInputInDropdown === false) {
      $('.dropdown').removeClass('dropdown--active');
      $('body').off('click', hideAllDropdowns);
    }
  };

  $('.dropdown__selected').on('click', function() {
    var $this = $(this);
    var $dropdown = $this.closest('.dropdown');
    var wasActive = $dropdown.hasClass('dropdown--active');

    $('.dropdown').removeClass('dropdown--active');

    if (wasActive === true) {
      return;
    }

    $('body').off('click', hideAllDropdowns);

    $dropdown.addClass('dropdown--active');

    setTimeout(function() {
      $('body').on('click', hideAllDropdowns);
    }, 1);
  });
});
