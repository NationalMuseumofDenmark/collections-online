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
  var via = '';
  var twitterAccount = $('meta[name="twitter:site"]').attr('content');
  if (twitterAccount){
    via += '&via=' + twitterAccount;
  }
  window.open('https://twitter.com/intent/tweet?url='
    + escape(window.location.href) + via
  );
  return false;
}

$(function() {
  var Snackbar = window.Snackbar;
  Snackbar.init();

  var AssetPage = window.AssetPage;
  AssetPage.init();

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
