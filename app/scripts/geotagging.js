var resizeMap;

(function($) {
  // Let's define a global function, to be called when initializing or when
  // the window resizes.
  resizeMap = function() {
    var assetImgHeight = $('.primary-asset img').height();
    $('#geotagging-map').height(assetImgHeight);
    google.maps.event.trigger(map, 'resize');
  }

  $('.call-to-action .btn').click(function() {
    $(this).hide();
    $('.map-container').slideDown('slow', function() {
      // resize google map to match asset image on click and on window resize
      $( window ).bind('resize', resizeMap).trigger('resize');
      map.setCenter(marker.getPosition());
    });
  });

  $('.map-buttons .hide-map').click(function() {
    $('.map-container').slideUp('slow', function() {
      $('.call-to-action .btn').show();
      $( window ).unbind('resize', resizeMap);
    });
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
  var initialPosition = new google.maps.LatLng(55.6747, 12.5747);
  map = new google.maps.Map(document.getElementById('geotagging-map'), {
    center: initialPosition,
    zoom: 12
  });

  // Place a draggable marker on the map
  marker = new google.maps.Marker({
    position: initialPosition,
    map: map,
    draggable:true
  });

  google.maps.event.addListener(map, 'click', function(event) {
    marker.setPosition(event.latLng);
  });

  resizeMap();
}
