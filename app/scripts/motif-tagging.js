'use strict';

var ga;

(function($) {

  var GA_EVENT_CATEGORY = 'CrowdTag';
  var EDIT_VISION_TAGS_SELECTOR = '.edit-vision-tags';
  var CANCEL_VISION_TAGS_SELECTOR = '.cancel-vision-tags';
  var VISION_CONTAINER_SELECTOR = '.tags-container.vision';
  var VISION_TAGS_SELECTOR = '.tags-container.vision [data-tag]';
  var ADD_VISION_TAG_SELECTOR = '.tags-container.vision .add-tag';
  var $editVisionTags = $(EDIT_VISION_TAGS_SELECTOR);
  var $cancelVisionTags = $(CANCEL_VISION_TAGS_SELECTOR);
  var isEditingVisionTags = false;
  var $visionNoTags = $('.vision .no-tags');
  var $visionBtn = $('#vision-btn');
  var $visionTags = $('.tags-container.vision');
  var $crowdNoTags = $('.crowd .no-tags');
  var $crowdBtn = $('#crowd-btn');
  var $crowdTags = $('.tags-container.crowd');
  var $crowdInput = $('.tags-container.crowd input');
  var $asset = $('.asset');
  var catalogAlias = $asset.data('catalog');
  var assetId = $asset.data('id');
  var showError = function(msg) {
    var $error = $('<div class="alert alert-danger">');
    $error.text(msg);
    $crowdTags.append($error);
    ga('send', 'event', GA_EVENT_CATEGORY, 'Error', msg);
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
  function hasCrowdTags() {
    return $crowdTags.children('[data-tag]').size() > 0;
  }

  function hasVisionTags() {
    return $(VISION_TAGS_SELECTOR).size() > 0;
  }

  function createTagObject(tag, type) {
    var url = '/?q=' + encodeURIComponent(tag);
    var tagClassName = 'btn btn-default btn-small';
    var $new = $('<a href="' + url + '" class="' + tagClassName +
      '" data-tag="' + tag + '">' + tag + '</a>');
    if (type === 'vision') {
      $new.append('<span class="add-tag">' +
        '<svg><use xlink:href="#icon-thumbup"></use></svg>' +
        '</span>');
    }

    return $new;
  }

  function saveTag(tag) {
    var url = '/' + catalogAlias + '/' + assetId + '/save-crowd-tag';
    var data = {
      tag: tag
    };
    return $.post(url, data, null, 'json');
  }

  function addTag(input) {
    input = input || $crowdInput.val();
    // Don't submit nothing
    if (input.length !== 0) {
      var tag = input.trim().toLowerCase();
      var $new = createTagObject(tag).addClass('saving');
      // Figure out where to add tag by checking if we already have some tags
      if (hasCrowdTags() === true) {
        $('.crowd [data-tag]').last().after($new);
      } else {
        $crowdTags.prepend($new);
      }
      $crowdInput.typeahead('val', '');
      $(VISION_CONTAINER_SELECTOR).children('[data-tag="' + tag + '"]')
        .remove();

      $crowdNoTags.hide();

      // Save tag in cumulus
      saveTag(tag)
        .done(function() {
          var Snackbar = window.Snackbar;

          $new.removeClass('saving');
          window.contributionAdded();
          // Don't show the facebook popup and the thank you message
          // at the same time
          if (window.showFacebookMaybe() === false) {
            Snackbar.info('Gemt! Tak for dit bidrag!');
          }
          ga('send', 'event', GA_EVENT_CATEGORY, 'Save', 'Succes');
        })
        .fail(function(response) {
          $new.remove();
          $crowdInput.typeahead('val', input);
          showError(response.responseJSON.message || 'Der skete en fejl.');
          if (hasCrowdTags() === false) {
            $crowdNoTags.show();
          }
        });
    } else {
      console.log('Empty input');
    }
  }

  function confirmVisionTags() {
    if (hasVisionTags()) {
      $(VISION_TAGS_SELECTOR).addClass('confirming').on('click', function(e) {
        e.preventDefault();
        var $tag = $(this).closest('[data-tag]');
        var tagName = $tag.attr('data-tag');

        addTag(tagName);
        ga('send', 'event', GA_EVENT_CATEGORY, 'Add', 'Vision topic');
        return false;
      });
    }
  }

  // ACTIONS
  $visionBtn.click(function() {
    $(this).addClass('loading disabled');
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
          var $tag = createTagObject(tag, 'vision');
          $visionTags.prepend($tag);
        }

        $editVisionTags.removeClass('hidden');
      }
    }).fail(function() {
      console.log('Ajax failed to fetch data');
    });
  });

  $crowdBtn.click(function() {
    if ($crowdTags.hasClass('inputting')) {
      addTag();
      ga('send', 'event', GA_EVENT_CATEGORY, 'Add', 'Button click');
    } else {
      confirmVisionTags();
      $crowdTags.addClass('inputting');
      $crowdTags.find('input').focus();
      $crowdNoTags.hide();
    }
  });

  $crowdInput.keyup(function(event) {
    $('.crowd .alert').remove();
    if (event.keyCode === 13) {
      addTag();
      ga('send', 'event', GA_EVENT_CATEGORY, 'Add', 'Enter press');
      console.log(GA_EVENT_CATEGORY);
    }
  });

  // Classes for input styling purposes
  $crowdInput.focus(function() {
    $(this).parent('span').addClass('focused valid');
  });
  $crowdInput.blur(function() {
    var $this = $(this);
    $this.parent('span').removeClass('focused');
    if ($this.val().length === 0) {
      $this.parent('span').removeClass('valid');
      $crowdTags.removeClass('inputting');
      if (hasCrowdTags() === false) {
        $crowdNoTags.show();
      }
    }
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
