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

/**
 * Construct a redirect url and pop up a share window for Skoletube.
 */
function skoletubeshareCurrentPage() {
  // Collect metadata to send to skoletube. We piggyback on the og: tags.
  var title = $('meta[property="og:title"]').attr('content');
  var description = $('meta[property="og:description"]').attr('content');
  var thumbnail = $('meta[property="og:image"]').attr('content');
  var keywords = 'Nationalmuseet samlinger';

  // Construct url for the download.
  var embed_code = $('meta[property="og:url"]').attr('content') + '/download/original-jpeg';

  // Construct the url and open a new share-window.
  var url = 'https://www.skoletube.dk/upload.php?secondpage=embed'
  + '&embed_code=' + encodeURIComponent(embed_code)
  + '&thumbnail=' + encodeURIComponent(thumbnail)
  + '&iframe=false'
  + '&media_title=' + encodeURIComponent(title)
  + '&media_descr=' + encodeURIComponent(description)
  + '&media_keywords=' + encodeURIComponent(keywords);

  window.open(url);
  return false;
}

$(function() {
  var AssetPage = window.AssetPage;
  AssetPage.init();

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
