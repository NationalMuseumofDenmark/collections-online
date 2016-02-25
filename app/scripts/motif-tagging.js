'use strict';

var $asset = $('.asset');
var $tags = $('.asset .tags.vision');
$('.add-tags-btn', $asset).click(function() {
  $(this).addClass('loading');
  $('.vision .no-tags').remove();
  $('.add-tags-btn .text').remove();
  $.ajax({
    dataType: 'json',
    url: window.location + '/suggested-motif-tags'
  }).done(function(data) {
    $('.add-tags-btn').remove();
    console.log(data.tags);
    var arrayLength = data.tags.length;
    if(arrayLength !== 0) {
      for (var i = 0; i < arrayLength; i++) {
        var tag = data.tags[i];
        var tagUrl = '/?q=' + encodeURIComponent(tag);
        var $tag = $('<a href="' + tagUrl + '" class="tag">' + tag + '</a>');
        $tags.append($tag);
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
