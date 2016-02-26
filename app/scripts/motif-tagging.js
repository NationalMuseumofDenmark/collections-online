'use strict';

(function($) {
  var $visionNoTags = $('.vision .no-tags');
  var $visionBtn    = $('#vision-btn');
  var $visionTags   = $('.tags.vision');
  var $crowdNoTags  = $('.crowd .no-tags');
  var $crowdBtn     = $('#crowd-btn');
  var $crowdTags    = $('.tags.crowd');
  var $crowdInput   = $('.tags.crowd input');
  var $item         = $('.item');
  var catalogAlias  = $item.data('catalog-alias');
  var itemId        = $item.data('item-id');

  function saveTag(tag) {
    var url = '/' + catalogAlias + '/' + itemId + '/save-crowd-tag';
    var data = { tag: tag };
    return $.post(url, data, null, 'json');
  }

  var showError = function(msg) {
    var $error = $('<div class="alert alert-danger">');
    $error.text(msg);
    $crowdTags.append($error);
    //ga('send', 'event', GA_EVENT_CATEGORY, 'error', msg);
  };

  $visionBtn.click(function() {
    $(this).addClass('loading');
    $visionNoTags.remove();
    $visionBtn.children('.text').remove();
    $.ajax({
      dataType: 'json',
      url: window.location + '/suggested-motif-tags'
    }).done(function(data) {
      $visionBtn.remove();
      console.log(data.tags);
      var arrayLength = data.tags.length;
      if (arrayLength !== 0) {
        for (var i = 0; i < arrayLength; i++) {
          var tag = data.tags[i];
          var tagUrl = '/?q=' + encodeURIComponent(tag);
          var $tag = $('<a href="' + tagUrl + '" class="tag">' + tag + '</a>');
          $visionTags.append($tag);
        }
      }
    }).fail(function() {
      console.log('Ajax failed to fetch data');
    });
  });

  $crowdBtn.click(function() {
    $(this).remove();
    $crowdTags.addClass('inputting');
    $crowdTags.find('input').focus();
    $crowdNoTags.remove();
  });
  $crowdInput.keyup(function(e) {
    $('.crowd .alert').remove();
    if (e.keyCode === 13) {
      var tag = $(this).val().trim().toLowerCase();
      var $tag = $('<span class="tag new">' + tag + '</span>');
      $tag.click(function() {
        $(this).remove();
      });
      saveTag(tag)
      .done(function() {
        var $icon = $('<svg><use xlink:href="#icon-minus" /></svg>');
        $tag.append($icon);
        $crowdTags.append($tag);
        $crowdInput.val('');
      })
      .fail(function(response) {
        var error = response.responseJSON;
        showError(error.message || 'Der skete en uventet fejl.');
      });

    }
  });
})(jQuery);
