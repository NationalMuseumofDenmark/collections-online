'use strict';

var resizeMap;
var map;
var assetMap;
var streetView;
var marker;
var headingMarker;
var google;
var ga;
var mapHeading = 0;

(function($) {

  // Check if we should show facebook-thanks on load
  window.showFacebookMaybe();

  var GA_EVENT_CATEGORY = 'Geotagging';
  var $mapWrap = $('.map-wrap');
  var $imgWrap = $('.img-col');
  var mapVisible = 'map-visible';
  var $map = $('#geotagging-map');
  var $mapOverlay = $('.map-container .overlay');
  var $editCoordinates = $('#edit-coordinates');
  var $imageColumn = $('.img-col');

  // Let's define a global function, to be called when initializing or when
  // the window resizes.
  resizeMap = function() {
    $map.height($map.width());
    var center = map.getCenter();
    google.maps.event.trigger(map, 'resize');
    map.setCenter(center);
  };

  var showMap = function() {
    if (!window.localStorage.getItem('geotagging-overlay-closed')) {
      $mapOverlay.addClass('overlay-visible');
    }
    $imageColumn.addClass('col-md-6');
    $mapWrap.addClass(mapVisible);
    $imgWrap.addClass(mapVisible);
    $('.big-image').removeClass('big-image');
    $(window).bind('resize', resizeMap).trigger('resize');
    $('html, body').animate({
      scrollTop: $mapWrap.offset().top - 100
    }, 400);
  };

  var hideMap = function() {
    ga('send', 'event', GA_EVENT_CATEGORY, 'Hide');
    $imageColumn.removeClass('col-md-6');
    $mapWrap.removeClass(mapVisible);
    $imgWrap.removeClass(mapVisible);
    $(window).unbind('resize', resizeMap);
    $editCoordinates.removeClass('disabled');
  };

  var showError = function(msg) {
    var $error = $('<div class="alert alert-danger">');
    $error.text(msg);
    $('.geotagging').append($error);
    ga('send', 'event', GA_EVENT_CATEGORY, 'error', msg);
  };

  $editCoordinates.click(function() {
    ga('send', 'event', GA_EVENT_CATEGORY, 'Show map',
      'Via call-to-action');
    $(this).addClass('disabled');
    showMap();
  });

  $('[data-action=edit-place]').click(function() {
    ga('send', 'event', GA_EVENT_CATEGORY, 'Show map', 'Editing');
    showMap();
  });

  $('.map-buttons .hide-map').click(function() {
    hideMap();
  });

  $('.back-to-map').click(function() {
    streetView.setVisible(false);
  });

  $('.overlay .close-overlay').click(function() {
    window.localStorage.setItem('geotagging-overlay-closed', true);
    $mapOverlay.removeClass('overlay-visible');
  });

  $('.map-buttons .save-coordinates').click(function() {
    ga('send',
      'event',
      GA_EVENT_CATEGORY,
      'Started saving',
      streetView.getVisible() ? 'In street view' : 'Not in street view'
    );

    $(this).addClass('disabled loading');
    $('.map-buttons .hide-map').hide();
    var data = {
      heading: mapHeading,
      latitude: marker.getPosition().lat(),
      longitude: marker.getPosition().lng()
    };

    var $asset = $('.asset');
    var catalogAlias = $asset.data('catalog');
    var assetId = $asset.data('id');
    var url = '/' + catalogAlias + '/' + assetId + '/save-geotag';
    $.ajax({
      type: 'post',
      url: url,
      data: data,
      dataType: 'json',
      success: function(response) {
        if (response.success) {
          window.contributionAdded();
          ga('send',
            'event',
            GA_EVENT_CATEGORY,
            'Saved', catalogAlias + '-' + assetId, {
              hitCallback: function() {
                location.reload();
              }
            });
        } else {
          showError('Der skete en fejl - prøv igen');
        }
      },
      error: function(response) {
        var err = response.responseJSON;
        showError(err.message || 'Der skete en uventet fejl.');
        $('.map-buttons .hide-map').show();
        $('.map-buttons .save-coordinates').removeClass('disabled loading');
      }
    });
  });

  window.initMap = function() {
    var initialPosition = new google.maps.LatLng(55.6747, 12.5747);
    var latitude = $('.asset').data('latitude');
    var longitude = $('.asset').data('longitude');
    var heading = $('.asset').data('heading');
    var address = $('.asset').data('full-address');

    var mapOptions = {
      center: initialPosition,
      zoom: 16,
      mapTypeControlOptions: {
        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
        mapTypeIds: [
          google.maps.MapTypeId.ROADMAP,
          google.maps.MapTypeId.SATELLITE
        ]
      },
      styles: [{
        featureType: 'transit',
        stylers: [{
          visibility: 'off'
        }]
      }]
    };

    map = new google.maps.Map(document.getElementById('geotagging-map'),
      mapOptions);

    // Show asset location on map if asset has a geolocation
    if (document.getElementById('asset-map')) {
      assetMap = new google.maps.Map(document.getElementById('asset-map'),
        mapOptions);
      assetMap.setZoom(13);
      assetMap.setCenter({lat: latitude, lng: longitude});
    }

    if (latitude && longitude) {
      marker = new google.maps.Marker({
        map: assetMap,
        icon: '/images/map_pin_red.png',
        position: {lat: latitude, lng: longitude}
      });
    }

    streetView = map.getStreetView();
    // https://developers.google.com/maps/documentation/javascript/controls
    // https://developers.google.com/maps/documentation/javascript/examples/
    // streetview-controls
    streetView.setOptions({
      addressControl: false,
      panControl: false,
      zoomControl: false,
      scrollwheel: false
    });

    // TODO: Lets use symbols instead
    // https://developers.google.com/maps/documentation/javascript/examples/
    // overlay-symbol-custom
    marker = new google.maps.Marker({
      map: map,
      icon: '/images/camera_pin_green.png',
      draggable: true
    });

    headingMarker = new google.maps.Marker({
      map: map,
      icon: '/images/heading_pin_red.png',
      draggable: true
    });

    var headingLine = new google.maps.Polyline({
      map: map,
      strokeColor: '#333333'
    });

    var input = $('#pac-input')[0];
    var searchBox = new google.maps.places.SearchBox(input);
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

    function calculateHeading() {
      return google.maps.geometry.spherical.computeHeading(marker.getPosition(),
        headingMarker.getPosition());
    }

    function recalculateLine() {
      var tempPov = streetView.getPov();
      tempPov.heading = mapHeading;

      streetView.setPov(tempPov);
      headingLine.setPath([marker.getPosition(), headingMarker.getPosition()]);
    }

    if (latitude && longitude) {
      var latLng = new google.maps.LatLng(latitude, longitude);
      marker.setPosition(latLng);
      map.setCenter(latLng);

      if (heading) {
        mapHeading = heading;
        var headingLatLng = google.maps.geometry.spherical.computeOffset(
          latLng,
          100, mapHeading);
        headingMarker.setPosition(headingLatLng);
        recalculateLine();
      }

    } else if (address) {
      var geocoder = new google.maps.Geocoder();
      geocoder.geocode({
        'address': address
      }, function(results, status) {
        if (status === google.maps.GeocoderStatus.OK) {
          var geocodeLocation = results[0].geometry.location;
          var geocodeLatLng = new google.maps.LatLng(geocodeLocation.lat(),
            geocodeLocation.lng());

          map.setCenter(geocodeLatLng);
          resizeMap();
        }
      });
      // Let's show the user that we have searched for this address
      $('#pac-input').val(address);
    }

    map.addListener('click', function(event) {
      // Ensure that distance between markers is the same on every zoom level
      var latIncrease = 100 * Math.pow(0.5, map.getZoom());
      var headingMarkerPosition = new google.maps.LatLng(event.latLng.lat() +
        latIncrease, event.latLng.lng());

      marker.setPosition(event.latLng);
      headingMarker.setPosition(headingMarkerPosition);
      headingLine.setPath([event.latLng, headingMarkerPosition]);
      mapHeading = calculateHeading();
    });

    streetView.addListener('pov_changed', function() {
      mapHeading = this.getPov().heading;
    });

    streetView.addListener('visible_changed', function() {
      marker.setVisible(!this.getVisible());
      headingMarker.setVisible(!this.getVisible());

      $('.hide-map').toggle(!this.getVisible());
      $('.save-coordinates').toggle(!this.getVisible());
      $('.back-to-map').toggle(this.getVisible());

      if (this.getPosition()) {
        var offset = google.maps.geometry.spherical
          .computeOffset(this.getPosition(), 100, mapHeading);
        marker.setPosition(this.getPosition());
        headingMarker.setPosition(offset);
        recalculateLine();
      }

      if (!this.getVisible() && this.getPosition()) {
        map.setZoom(16);
        map.setCenter(this.getPosition());
      }
    });

    marker.addListener('drag', function() {
      mapHeading = calculateHeading();
      recalculateLine();
    });

    headingMarker.addListener('drag', function() {
      mapHeading = calculateHeading();
      recalculateLine();
    });

    map.addListener('bounds_changed', function() {
      searchBox.setBounds(map.getBounds());
    });

    searchBox.addListener('places_changed', function() {
      var places = searchBox.getPlaces();

      if (places.length === 0) {
        return;
      }
      // For each place, get the icon, name and location.
      var bounds = new google.maps.LatLngBounds();
      places.forEach(function(place) {
        if (place.geometry.viewport) {
          // Only geocodes have viewport.
          bounds.union(place.geometry.viewport);
        } else {
          bounds.extend(place.geometry.location);
        }
      });
      map.fitBounds(bounds);
      map.setZoom(16);
    });

    resizeMap();
  };
})(jQuery);
