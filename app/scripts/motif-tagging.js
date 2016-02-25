'use strict';

var $visionNoTags = $('.vision .no-tags');
var $visionBtn = $('#vision-btn');
var $visionTags = $('.tags.vision');
var $userNoTags = $('.user .no-tags');
var $userBtn = $('#user-btn');
var $userTags = $('.tags.user');
var $userInput = $('.tags.user input');

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
        var $tag = $('<a href="' + tagUrl + '" class="tag">' + tag +
          '</a>');
        $visionTags.append($tag);
        // var $icon = $('<svg><use xlink:href="#icon-minus" /></svg>');
        // $tag.append($icon);
        // var $tag = $('<span class="btn btn-primary">' + tag + '</span>');
        // var $icon = $('<svg><use xlink:href="#icon-minus" /></svg>');
        // $tag.click(function() {
        //   $(this).remove();
        // });
      }
    }
  }).fail(function() {
    console.log('Ajax failed to fetch data');
  });
});

$userBtn.click(function() {
  $(this).remove();
  $userTags.addClass('inputting');
  $userTags.find('input').focus();
  $userNoTags.remove();
});
$userInput.keyup(function(e) {
  if (e.keyCode === 13) {
    alert($(this).val());
  }
});
