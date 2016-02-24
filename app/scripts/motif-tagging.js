'use strict';

var $asset = $('.asset');
var $tags = $('.asset .tags');
$('.add-tags-btn', $asset).click(function() {
  $(this).addClass('loading');
  $('.add-tags-btn .text').remove();
  $.ajax({
    dataType: 'json',
    url: window.location + '/suggested-motif-tags'
  }).done(function(data) {
    $('.add-tags-btn').remove();
    $('.no-tags').hide();
    console.log(data.tags);
    var arrayLength = data.tags.length;
    if(arrayLength !== 0) {
      for (var i = 0; i < arrayLength; i++) {
        // var tagUrl = '/?q=' + encodeURIComponent(tag);
        var tag = data.tags[i];
        var $tag = $('<span class="btn btn-primary">' + tag + '</span>');
        var $icon = $('<svg><use xlink:href="#icon-minus" /></svg>');
        $tag.append($icon);
        $tags.append($tag);
        $tag.click(function() {
          $(this).remove();
        });
      }
    }
  }).fail(function() {
    console.log('Ajax failed to fetch data');
  });
});
