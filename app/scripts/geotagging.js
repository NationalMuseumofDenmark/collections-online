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
    /*icon: {
      path: 'M268.7 0h-235C14.8 0 0 15 0 33.6v235c0 18.5 15 33.7 33.6 33.7h67.2l50.3 50.3 50.5-50.4h67.2c18.4 0 33.6-15 33.6-33.5v-235C302.3 15 287 0 268.6 0z M151.7 127.6c15.6 0 28.2 12.6 28.2 28.2S167.2 184 151.6 184c-19.5 0-28.3-16.6-28.3-28.2 0-15.6 12.7-28.2 28.3-28.2zm-26.5-60L109 85H81c-9.7 0-17.6 8-17.6 17.6v106c0 9.7 8 17.7 17.6 17.7h141.3c9.7 0 17.7-8 17.7-17.7v-106c0-9.7-8-17.6-17.7-17.6h-28l-16-17.7h-53zM151.7 200c-24.4 0-44.2-19.8-44.2-44.2s19.8-44 44.2-44c24.4 0 44 19.7 44 44 0 24.4-19.6 44.2-44 44.2z',
      scale: 0.1,
      fillColor: 'black',
      fillOpacity: 1,
      anchor: new google.maps.Point(150,370)
    },*/
    draggable: true
  });

  headingMarker = new google.maps.Marker({
    map: map,
    /*icon: {
      path: 'M268.7 0h-235C14.8 0 0 15 0 33.6v235c0 18.5 15 33.7 33.6 33.7h67.2l50.3 50.3 50.5-50.4h67.2c18.4 0 33.6-15 33.6-33.5v-235C302.3 15 287 0 268.6 0z M129.4 79.4c0 13.5-11 24.4-24.4 24.4-13.5 0-24.4-11-24.4-24.4C80.6 66 91.6 55 105 55c13.5 0 24.4 11 24.4 24.4zM193 131L134.4 207l-42-50.6-58.7 75.6h235L193 131z',
      scale: 0.1,
      fillColor: '#fff',
      anchor: new google.maps.Point(150,370)
    },*/
    draggable:true
  });

  var headingLine = new google.maps.Polyline({
    map: map,
    strokeColor: '#9E0B0F'
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
