(function($) {
  var resizeMap = function(){
    var assetImgHeight = $('.primary-asset img').height()
    $('#geotagging-map').height(assetImgHeight);

    if($('#geotagging-map').is(':visible')){
      google.maps.event.trigger(map, 'resize');
    }
  }

  $('.call-to-action .btn').click(function() {
    $('.map-container').slideDown('slow');
    $(this).hide();

    // resize google map to match asset image on load and on window resize
    $( window ).bind("resize",function() {
      resizeMap();
    }).trigger('resize');
  });

  $('.map-buttons .hide-map').click(function() {
    $('.map-container').slideUp('slow');
    $('.call-to-action .btn').show();

    $( window ).unbind('resize');
  });

  $('.map-buttons .save-coordinates').click(function() {
    var data = {};
    if(map.getStreetView().getVisible()){
      data.latitude = map.getStreetView().getPosition().lat();
      data.longitude = map.getStreetView().getPosition().lng();
      data.pov = map.getStreetView().getPov();
    } else{
      data.latitude = marker.getPosition().lat();
      data.longitude = marker.getPosition().lng();
    }
    var $item = $('.item');
    var catalogAlias = $item.data('catalog-alias');
    var itemId = $item.data('item-id');
    console.log('Saving geo-tag', catalogAlias, itemId, data);
    var url = '/' + catalogAlias + '/' + itemId + '/save-geotag';
    $.post(url, data, function(response) {
      console.log(response);
    });
  });
})(jQuery);

var map;
var marker;
function initMap() {
  var myLatlng = new google.maps.LatLng(55.6776555,	12.5691513);
  map = new google.maps.Map(document.getElementById('geotagging-map'), {
    center: myLatlng,
    zoom: 12
  });

  // Place a draggable marker on the map
  marker = new google.maps.Marker({
    position: myLatlng,
    map: map,
    draggable:true
  });

  google.maps.event.addListener(map, 'click', function(event) {
    marker.setPosition(event.latLng);
  });
}
