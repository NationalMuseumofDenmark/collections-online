'use strict';

var resizeMap;
var map;
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
  var $mapContainer = $('#geotagging');
  var $map = $('#geotagging-map');

  // Let's define a global function, to be called when initializing or when
  // the window resizes.
  resizeMap = function() {
    var mapHeight = $mapContainer.width() * 0.8;
    $map.height(mapHeight);
    var center = map.getCenter();
    google.maps.event.trigger(map, 'resize');
    map.setCenter(center);
  };

  var showMap = function() {
    if (!window.localStorage.getItem('geotagging-overlay-closed')) {
      $('.geotagging .overlay').addClass('overlay-visible');
    }
    $('.map-container').slideDown('slow', function() {
      // resize google map to match asset image on click and on window resize
      $(window).bind('resize', resizeMap).trigger('resize');
    });
  };

  var showError = function(msg) {
    var $error = $('<div class="alert alert-danger">');
    $error.text(msg);
    $('.geotagging').append($error);
    ga('send', 'event', GA_EVENT_CATEGORY, 'error', msg);
  };

  $('.call-to-action .btn').click(function() {
    ga('send', 'event', GA_EVENT_CATEGORY, 'Show map',
      'Via call-to-action');
    $(this).hide();
    showMap();
  });

  $('[data-action=edit-place]').click(function() {
    ga('send', 'event', GA_EVENT_CATEGORY, 'Show map', 'Editing');
    $('html, body').animate({
      scrollTop: $('#geotagging-anchor').offset().top - 100
    }, 400);
    showMap();
  });

  $('.map-buttons .hide-map').click(function() {
    ga('send', 'event', GA_EVENT_CATEGORY, 'Hide');
    $('.map-container').slideUp('slow', function() {
      $('.call-to-action .btn').show();
      $(window).unbind('resize', resizeMap);
    });
  });

  $('.back-to-map').click(function() {
    streetView.setVisible(false);
  });

  $('.overlay .close-overlay').click(function() {
    window.localStorage.setItem('geotagging-overlay-closed', true);
    $('.geotagging .overlay').removeClass('overlay-visible');
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

    var $item = $('.item');
    var catalogAlias = $item.data('catalog');
    var itemId = $item.data('id');
    console.log('Saving geo-tag', catalogAlias, itemId, data);
    var url = '/' + catalogAlias + '/' + itemId + '/save-geotag';
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
            'Saved', catalogAlias + '-' + itemId, {
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
    var address = $('#address').text();
    var latitude = $('.asset').data('latitude');
    var longitude = $('.asset').data('longitude');
    var heading = $('.asset').data('heading');

    map = new google.maps.Map(document.getElementById('geotagging-map'), {
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
    });

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

      $('.map-buttons .hide-map').toggle(!this.getVisible());
      $('.map-buttons .save-coordinates').toggle(!this.getVisible());
      $('.map-buttons.back-to-map').toggle(this.getVisible());

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

// Prevent Roboto from loading
var head = document.getElementsByTagName('head')[0];
var insertBefore = head.insertBefore;
head.insertBefore = function(newElement, referenceElement) {
  if (newElement.href && newElement.href.indexOf(
      'https://fonts.googleapis.com/css?family=Roboto') === 0) {
    return;
  }
  insertBefore.call(head, newElement, referenceElement);
};
