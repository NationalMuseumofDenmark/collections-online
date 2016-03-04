'use strict';

(function($) {

  // VARIABLES
  var $visionNoTags = $('.vision .no-tags');
  var $visionBtn = $('#vision-btn');
  var $visionTags = $('.tags-container.vision');
  var $crowdNoTags = $('.crowd .no-tags');
  var $crowdBtn = $('#crowd-btn');
  var $crowdTags = $('.tags-container.crowd');
  var $crowdInput = $('.tags-container.crowd input');
  var $item = $('.item');
  var catalogAlias = $item.data('catalog');
  var itemId = $item.data('id');
  var showError = function(msg) {
    var $error = $('<div class="alert alert-danger">');
    $error.text(msg);
    $crowdTags.append($error);
  };
  var typeaheadTags = new Bloodhound({
    datumTokenizer: function(tags) {
      return Bloodhound.tokenizers.whitespace(tags);
    },
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    remote: {
      url: '/motif-tag-suggestions?text=%QUERY',
      wildcard: '%QUERY',
      cache: false
    }
  });

  // FUNCTIONS
  function saveTag(tag) {
    var url = '/' + catalogAlias + '/' + itemId + '/save-crowd-tag';
    var data = {
      tag: tag
    };
    return $.post(url, data, null, 'json');
  }

  function createTag(tag) {
    var url = '/?q=' + encodeURIComponent(tag);
    var tagClassName = 'btn btn-default btn-small';
    var $new = $('<a href="' + url + '" class="'+ tagClassName +'" data-tag="' +
                 tag + '">' + tag + '</a>');
    return $new;
  }

  function addTag() {
    // Don't submit nothing
    if ($crowdInput.val().length !== 0) {
      var input = $crowdInput.val();
      var tag = input.trim().toLowerCase();
      var $new = createTag(tag).addClass('saving');
      // Figure out where to add tag by checking if we already have some tags
      if ($('.crowd [data-tag]').length) {
        $('.crowd [data-tag]').last().after($new);
      } else {
        $crowdTags.prepend($new);
      }
      $crowdInput.typeahead('val', '');

      // Save tag in cumulus
      saveTag(tag)
        .done(function() {
          $new.removeClass('saving');
          window.contributionAdded();
          window.showFacebookMaybe();
        })
        .fail(function(response) {
          $new.remove();
          $crowdInput.typeahead('val', input);
          showError(response.responseJSON.message || 'Der skete en fejl.');
        });
    } else {
      console.log('Empty input');
    }
  }

  // ACTIONS
  $visionBtn.click(function() {
    $(this).addClass('loading').children('.text').remove();
    $visionNoTags.remove();
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
          var $tag = createTag(tag);
          $visionTags.append($tag);
        }
      }
    }).fail(function() {
      console.log('Ajax failed to fetch data');
    });
  });

  $crowdBtn.click(function() {
    if ($crowdTags.hasClass('inputting')) {
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

  // Classes for input styling purposes
  $crowdInput.focus(function() {
    $(this).parent('span').addClass('focused valid');
  });
  $crowdInput.blur(function() {
    $(this).parent('span').removeClass('focused');
    if($(this).val().length === 0){
      $(this).parent('span').removeClass('valid');
    }
  });

  $('.tags-container.vision').on('click', '[data-tag]', function() {

  });

  // Typeahead: Initialize the bloodhound suggestion engine
  typeaheadTags.initialize();

  $crowdInput.typeahead({
    hint: false,
    highlight: true,
    minLength: 1
  }, {
    name: 'tags',
    source: typeaheadTags
  });

})(jQuery);
