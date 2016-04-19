'use strict';

function checkDateInput() {
  var input = document.createElement('input');
  input.setAttribute('type', 'date');

  var notADateValue = 'not-a-date';
  input.setAttribute('value', notADateValue);

  return (input.value !== notADateValue);
}

function fbshareCurrentPage() {
  window.open('https://www.facebook.com/sharer/sharer.php?u='
    + escape(window.location.href)
  );
  return false;
}

function twittershareCurrentPage() {
  window.open('https://twitter.com/intent/tweet?url='
    + escape(window.location.href) + '&via=nationalmuseet'
  );
  return false;
}

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

  // Check that dropdown options are on screen
  var repositionDropdowns = function() {
    $('.dropdown__options').each(function() {
      var dropOffLeft = $(this).offset().left;
      var dropdownWidth = $(this).width();
      var wrapWidth = $('.main-wrapper').width();
      var isEntirelyVisible = (dropOffLeft + dropdownWidth <=
        wrapWidth);
      if (!isEntirelyVisible) {
        var topOffset = $(this).offset().top;
        var paddingLeft = $(this).position().left;
        var newLeftOffset = wrapWidth - dropdownWidth + paddingLeft /
          2;
        $(this).offset({
          top: topOffset,
          left: newLeftOffset
        });
      }
    });
  };

  repositionDropdowns();


  $('#search-input').on('focus', function() {
    $(this).parent().addClass('input-group--focus');
  });
  $('#search-input').on('blur', function() {
    $(this).parent().removeClass('input-group--focus');
  });

  var updateQueryStringParameter = function(uri, key, value) {
    var re = new RegExp('([?&])' + key + '=.*?(&|$)', 'i');
    var separator = uri.indexOf('?') !== -1 ? '&' : '?';
    if (uri.match(re)) {
      return uri.replace(re, '$1' + key + '=' + value + '$2');
    } else {
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

  if (checkDateInput() === false) {
    $('input[type="date"]').formatter({
      'pattern': '{{99}}/{{99}}/{{9999}}'
    });
  }
});
