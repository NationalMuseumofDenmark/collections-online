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
  var showError = function(msg) {
    var $error = $('<div class="alert alert-danger">');
    $error.text(msg);
    $crowdTags.append($error);
  };

  function saveTag(tag) {
    var url = '/' + catalogAlias + '/' + itemId + '/save-crowd-tag';
    var data = { tag: tag };
    return $.post(url, data, null, 'json');
  }

  function addTag(){
    // Don't submit nothing
    if ($crowdInput.val().length !== 0){
      var $input = $crowdInput.val();
      var tag = $input.trim().toLowerCase();
      var icon = ('<svg><use xlink:href="#icon-delete" /></svg>');
      var $newTag = $('<span class="tag new">' + tag + icon + '</span>');
      var $excistingTags = $('.tags.crowd .tag');
      // Figure out where to add the new tag
      if ($excistingTags) {
        $excistingTags.last().after($newTag);
      } else {
        $crowdTags.prepend($newTag);
      }
      $crowdInput.val('');
      // Save tag in cumulus
      saveTag(tag)
      .done(function() {
        console.log('Tag saved in cumulus');
        // Add class for styling purpose (cursor pointer)
        $newTag.addClass('saved');
        // Let user remove the added tag again
        $newTag.click(function() {
          $(this).remove();
          // TODO this should delete tag from cumulus
        });
      })
      .fail(function(response) {
        $newTag.remove();
        $crowdInput.val($input);
        var error = response.responseJSON;
        showError(error.message || 'Der skete en uventet fejl.');
      });
    } else {
      console.log('Empty input');
    }
  }

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
    if ($crowdTags.hasClass('inputting')){
      addTag();
    } else {
      $crowdTags.addClass('inputting');
      $crowdTags.find('input').focus();
      $crowdNoTags.remove();
    }
  });
  $crowdInput.keyup(function(event) {
    $('.crowd .alert').remove();
    if (event.keyCode === 13) {
      addTag();
    }
  });
})(jQuery);
