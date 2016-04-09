'use strict';

// Toogle asset images - zome in and out
$(function() {

  var Snackbar = window.Snackbar;
  Snackbar.init();

  var AssetPage = window.AssetPage;
  AssetPage.init();

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

  var updateQueryStringParameter = function(uri, key, value) {
    var re = new RegExp('([?&])' + key + '=.*?(&|$)', 'i');
    var separator = uri.indexOf('?') !== -1 ? '&' : '?';
    if (uri.match(re)) {
      return uri.replace(re, '$1' + key + '=' + value + '$2');
    }
    else {
      return uri + separator + key + '=' + value;
    }
  };

  $('form[data-method="modify-query"]').on('submit', function(e) {
    e.preventDefault();
    var $this = $(this);
    var $inputs = $this.find('[name]:input');

    var url = window.location.pathname + window.location.search;

    $inputs.each(function() {
      var $this = $(this);
      var key = $this.attr('name');
      var val = $this.val();
      url = updateQueryStringParameter(url, key, val);
    });

    window.location.href = url;

    return false;
  });
});
