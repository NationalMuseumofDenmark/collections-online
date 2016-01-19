(function($) {
  $('.call-to-action .btn').click(function() {
    $('#geotagging-map').slideToggle('slow');
  });

  $('.save-coordinates .btn').click(function() {
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
}
