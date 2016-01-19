(function($) {
  $('.call-to-action .btn').click(function() {
    $('#geotagging-map').slideToggle('slow');
  });

  $('.save-coordinates .btn').click(function() {
    if(map.getStreetView().getVisible()){
      console.log(map.getStreetView().getPosition().lat());
      console.log(map.getStreetView().getPosition().lng());
      console.log(map.getStreetView().getPov());
    }
    else{
      console.log(marker.getPosition().lat());
      console.log(marker.getPosition().lng());
    }

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
