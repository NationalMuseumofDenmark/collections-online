var resizeMap;
var map;
var streetView;
var marker;
var headingMarker;
var mapHeading;

(function($) {
  // Let's define a global function, to be called when initializing or when
  // the window resizes.
  resizeMap = function() {
    var assetImgHeight = $('.primary-asset img').height();
    $('#geotagging-map').height(assetImgHeight);
    var center = map.getCenter();
    google.maps.event.trigger(map, 'resize');
    map.setCenter(center);
  }

  var showError = function(msg) {
    $error = $('<div class="alert alert-danger">');
    $error.text(msg);
    $('.geotagging').append($error);
  };

  $('.call-to-action .btn').click(function() {
    $(this).hide();
    if(!window.localStorage.getItem('geotagging-overlay-closed')) {
      $('.geotagging .overlay').show();
    }
    $('.map-container').slideDown('slow', function() {
      // resize google map to match asset image on click and on window resize
      $( window ).bind('resize', resizeMap).trigger('resize');
    });
  });

  $('.map-buttons .hide-map').click(function() {
    $('.map-container').slideUp('slow', function() {
      $('.call-to-action .btn').show();
      $( window ).unbind('resize', resizeMap);
    });
  });

  $('.overlay .close-overlay').click(function() {
    window.localStorage.setItem('geotagging-overlay-closed', true);
    $('.geotagging .overlay').hide();
  });

  $('.map-buttons .save-coordinates').click(function() {
    $(this).addClass('disabled');
    $(this).text('Gemmer placering');
    $('.map-buttons .hide-map').hide();
    var data = {
      force: location.search.indexOf('forceGeotagging') !== -1
    };
    if(streetView.getVisible()){
      data.latitude = streetView.getPosition().lat();
      data.longitude = streetView.getPosition().lng();
      data.heading = mapHeading;
    } else {
      data.latitude = marker.getPosition().lat();
      data.longitude = marker.getPosition().lng();
      data.heading = mapHeading;
    }
    var $item = $('.item');
    var catalogAlias = $item.data('catalog-alias');
    var itemId = $item.data('item-id');
    console.log('Saving geo-tag', catalogAlias, itemId, data);
    var url = '/' + catalogAlias + '/' + itemId + '/save-geotag';
    $.ajax({
      type: 'post',
      url: url,
      data: data,
      dataType: 'json',
      success: function(response) {
        if(response.success) {
          location.reload();
        } else {
          showError('Der skete en fejl - prøv igen');
        }
      },
      error: function(response) {
        var err = response.responseJSON;
        showError(err.message || 'Der skete en uventet fejl.');
      }
    });
  });
})(jQuery);

function initMap() {
  var initialPosition = new google.maps.LatLng(55.6747, 12.5747);
  var address = $('#address').text();

  if(address){
    geocoder = new google.maps.Geocoder();

    geocoder.geocode({ 'address': address }, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          var geocodeLocation = results[0].geometry.location;
          var geocodeLatLng = new google.maps.LatLng(geocodeLocation.lat(), geocodeLocation.lng());

          map.setCenter(geocodeLatLng);
          resizeMap();
        }
    });
  }

  map = new google.maps.Map(document.getElementById('geotagging-map'), {
    center: initialPosition,
    zoom: 16
  });

  streetView = map.getStreetView();

  marker = new google.maps.Marker({
    map: map,
    icon: '/images/camera_pin_green.png',
    draggable: true
  });

  headingMarker = new google.maps.Marker({
    map: map,
    icon: '/images/heading_pin_red.png',
    draggable:true
  });

  var headingLine = new google.maps.Polyline({
    map: map,
    strokeColor: '#333333'
  });

  map.addListener('click', function(event) {
    // Ensure that the relative distance between markers is the same on every zoom level
    latIncrease = 100 * Math.pow(0.5, map.getZoom());
    headingMarkerPosition = new google.maps.LatLng(event.latLng.lat() + latIncrease, event.latLng.lng());

    marker.setPosition(event.latLng);
    headingMarker.setPosition(headingMarkerPosition);
    headingLine.setPath([event.latLng, headingMarkerPosition]);
    mapHeading = calculateHeading();
  });

  streetView.addListener('pov_changed', function(e){
    mapHeading = this.getPov().heading;
  });

  streetView.addListener('visible_changed', function(e) {
    marker.setVisible(!this.getVisible());
    headingMarker.setVisible(!this.getVisible());

    if(!this.getVisible()){
      offset = google.maps.geometry.spherical.computeOffset(this.getPosition(), 100, mapHeading);
      marker.setPosition(this.getPosition());
      headingMarker.setPosition(offset);

      map.setZoom(16);
      map.setCenter(this.getPosition());

      recalculateLine();
    }
  });

  marker.addListener('drag', function(event) {
    mapHeading = calculateHeading();
    recalculateLine();
  });

  headingMarker.addListener('drag', function(event) {
    mapHeading = calculateHeading();
    recalculateLine();
  });

  function calculateHeading() {
    return google.maps.geometry.spherical.computeHeading(marker.getPosition(), headingMarker.getPosition());
  }

  function recalculateLine() {
    tempPov = streetView.getPov();
    tempPov.heading = mapHeading;

    streetView.setPov(tempPov);
    headingLine.setPath([marker.getPosition(), headingMarker.getPosition()]);
  }

  resizeMap();
}
