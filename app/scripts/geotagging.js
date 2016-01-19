(function($) {
  var resizeMap = function(){
    var assetImgHeight = $('.primary-asset img').height()
    $('#geotagging-map').height(assetImgHeight);

    if($('#geotagging-map').is(':visible')){
      google.maps.event.trigger(map, 'resize');
    }
  }

  // resize google map to match asset image on load and on window resize
  $( window ).resize(function() {
    resizeMap();
  }).trigger('resize');

  $('.call-to-action .btn').click(function() {
    $('.map-container').slideDown('slow');
    $(this).hide();
    google.maps.event.trigger(map, 'resize');
  });

  $('.map-buttons .hide-map').click(function() {
    $('.map-container').slideUp('slow');
    $('.call-to-action .btn').show();
  });

  $('.map-buttons .save-coordinates').click(function() {
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

  google.maps.event.addListener(map, 'click', function(event) {
    marker.setPosition(event.latLng);
  });
}
