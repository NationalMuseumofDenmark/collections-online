var $asset = $('.asset');
var $tags = $('.asset .tags');
$('.add-tags-btn', $asset).click(function() {
  $(this).hide();
  $.ajax({
    dataType: 'json',
    url: window.location + '/suggested-motif-tags'
  }).done(function(data) {
    $('.no-tags').hide();
    console.log(data.tags);
    var arrayLength = data.tags.length;
    if(arrayLength !== 0) {
      for (var i = 0; i < arrayLength; i++) {
        var tag = data.tags[i];
        // var tagUrl = '/?q=' + encodeURIComponent(tag);
        $tag = $('<span class="btn btn-primary">' + tag + '</span>');
        $icon = $('<svg><use xlink:href="#icon-minus" /></svg>');
        $tag.append($icon);
        $tags.append($tag);
        $tag.click(function(e) {
            $(this).remove();
        });
      }
    }
  }).fail(function() {
    console.log('Ajax failed to fetch data');
  });
});
