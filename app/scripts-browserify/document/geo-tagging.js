'use strict';
/* global google, ga */

const config = require('../../../shared/config');
const helpers = require('../../../shared/helpers');

const Snackbar = require('../snackbar');
const contributionCounter = require('./contribution-counter');
const expandable = require('./expandable');

const GEO_TAGGING_MINI_MAP = '.geo-tagging-mini-map';
const GEO_TAGGING_SELECTOR = '.geo-tagging';
const INPUT_SELECTOR = '.geo-tagging__input';
const MAP_ELEMENT_SELECTOR = '.geo-tagging__map-element';
const OVERLAY_SELECTOR = '.geo-tagging__overlay';
const PLAYER_SELECTOR = '.geo-tagging__player';

const GEO_TAGGING_VISIBLE_CLASS = 'geo-tagging--visible';
const OVERLAY_VISIBLE_CLASS = 'geo-tagging__overlay--visible';

const BACK_TO_MAP_SELECTOR = '[data-action="back-to-map"]';
const SAVE_GEO_TAG_SELECTOR = '[data-action="save-geo-tag"]';
const START_GEO_TAGGING_SELECTOR = '[data-action="geo-tagging:start"]';
const STOP_GEOTAGGING_SELECTOR = '[data-action="geo-tagging:stop"]';
const CLOSE_OVERLAY_SELECTOR = '[data-action="close-overlay"]';

const LOCATION_SET_ZOOM = 16;
const GA_EVENT_CATEGORY = 'Geotagging';

const defaults = config.geoTagging.default || {};
defaults.position = defaults.position || {
  latitude: 55.6747,
  longitude: 12.5747
};
defaults.zoom = defaults.zoom || 16;

// TODO: Re-introduce the use of Google Analytics events
// TODO: Add pretty errors instead of silent fails

// Precondition on the availability of the helpers
if(!helpers.geoTagging ||
   typeof(helpers.geoTagging.getLocation) !== 'function') {
  throw new Error('Missing helpers.geoTagging.* helpers');
}

function generateMapOptions(latitude, longitude) {
  return {
    center: new google.maps.LatLng(latitude, longitude),
    zoom: defaults.zoom,
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
}

function addHeadingPolygon(map, latLng, heading, offset) {
  const computeOffset = google.maps.geometry.spherical.computeOffset;
  const headingLatLng1 = computeOffset(latLng, offset, heading + 15);
  const headingLatLng2 = computeOffset(latLng, offset, heading - 15);
  const headingPolyline = new google.maps.Polygon({
    map,
    fillColor: '#333333',
    fillOpacity: 0.05,
    strokeWeight: 0,
    clickable: false,
    paths: [headingLatLng1, latLng, headingLatLng2]
  });
}

function addApproximateCircle(map, latLng) {
  return new google.maps.Circle({
    map,
    fillColor: config.themeColor,
    fillOpacity: 0.33,
    strokeWeight: 0,
    center: latLng,
    clickable: false,
    radius: 90
  });
}

(function($) {

  class GeoTaggingController {

    constructor($geoTagging) {
      this.$geoTagging = $geoTagging;
      this.state = {
        saving: false,
        address: '',
        heading: 0,
        latitude: defaults.position.latitude,
        longitude: defaults.position.longitude
      };

      // Fetch the location metadata and then initialize the map
      // TODO: Perform a call to /json to get raw metadata about the asset
      // instead of saving this in the markup, as it makes the templates less
      // independent of the metadata schema used.
      // this.latitude = $('.asset').data('latitude');
      // this.longitude = $('.asset').data('longitude');
      // this.heading = $('.asset').data('heading');
      // this.address = $('.asset').data('full-address');

      this.initialize();

      // Bind some of the method, so they can be used as a callbacks directly
      this.resize = this.resize.bind(this);
      this.stop = this.stop.bind(this);

      // Register the listeners
      this.registerListeners();
    }

    initialize() {
      this.initializeMap();
      this.initializeStreetView();
      this.initializeMarkers();
      this.initializeSearchBox();
    }

    initializeMap() {
      const options = generateMapOptions(this.state.latitude,
                                         this.state.longitude);
      // TODO: Consider throwing an error if there is more than one map element
      const element = this.$geoTagging.find(MAP_ELEMENT_SELECTOR)[0];
      // Initialize the map
      this.map = new google.maps.Map(element, options);

      const originalSetCenter = this.map.setCenter.bind(this.map);
      this.map.setCenter = center => {
        if(center.lng() === 0) {
          throw new Error('Dont call setCenter with a 0');
        }
        originalSetCenter(center);
      };

      // Register listener
      this.map.addListener('click', (e) => {
        // Ensure that distance between markers is the same on every zoom level
        const headingOffset = 100 * Math.pow(0.5, this.map.getZoom());
        const lat = e.latLng.lat() + headingOffset;
        const lng = e.latLng.lng();
        const headingMarkerLatLng = new google.maps.LatLng(lat, lng);

        this.marker.setPosition(e.latLng);
        this.headingMarker.setPosition(headingMarkerLatLng);
        this.state.heading = this.calculateHeading();
        this.recalculateLine();
      });

      // When the map is full-screened, it should recenter and rezoom
      google.maps.event.addDomListener(window, 'resize', () => {
        if(this.state && this.state.latitude && this.state.longitude) {
          const center = new google.maps.LatLng(this.state.latitude,
                                                this.state.longitude);

          // Timeout is needed for the map to find its position before recenter
          setTimeout(() => {
            this.map.setCenter(center);
            this.map.setZoom(options.zoom);
          }, 1);
        }
      });
    }

    initializeStreetView() {
      this.streetView = this.map.getStreetView();
      // https://developers.google.com/maps/documentation/javascript/controls
      // https://developers.google.com/maps/documentation/javascript/examples/
      // streetview-controls
      this.streetView.setOptions({
        addressControl: false,
        panControl: false,
        zoomControl: false,
        scrollwheel: false
      });

      this.streetView.addListener('pov_changed', () => {
        this.state.heading = this.streetView.getPov().heading;
      });

      this.streetView.addListener('visible_changed', () => {
        const computeOffset = google.maps.geometry.spherical.computeOffset;
        const inStreetView = this.streetView.getVisible();

        this.marker.setVisible(!inStreetView);
        this.headingMarker.setVisible(!inStreetView);

        this.$geoTagging.find(STOP_GEOTAGGING_SELECTOR).toggle(!inStreetView);
        this.$geoTagging.find(SAVE_GEO_TAG_SELECTOR).toggle(!inStreetView);
        this.$geoTagging.find(BACK_TO_MAP_SELECTOR).toggle(inStreetView);

        const position = this.streetView.getPosition();
        if (position) {
          var offset = computeOffset(position, 100, this.state.heading);
          this.marker.setPosition(position);
          this.headingMarker.setPosition(offset);
          this.recalculateLine();
        }

        // If no longer in streetview, set the maps position
        if (!inStreetView && position) {
          this.map.setZoom(LOCATION_SET_ZOOM);
          this.map.setCenter(position);
        }
      });

      // When clicking back to map
      this.$geoTagging.on('click', BACK_TO_MAP_SELECTOR, () => {
        this.map.streetView.setVisible(false);
      });
    }

    initializeMarkers() {
      // TODO: Lets use symbols instead
      // https://developers.google.com/maps/documentation/javascript/examples/
      // overlay-symbol-custom
      this.marker = new google.maps.Marker({
        map: this.map,
        icon: '/images/camera_pin_green.png',
        draggable: true,
        clickable: false
      });

      this.headingMarker = new google.maps.Marker({
        map: this.map,
        icon: '/images/heading_pin_red.png',
        draggable: true,
        clickable: false
      });

      this.headingLine = new google.maps.Polyline({
        map: this.map,
        strokeColor: '#333333'
      });

      this.approximateCircle = addApproximateCircle(this.map, null);

      this.marker.addListener('drag', () => {
        this.state.heading = this.calculateHeading();
        this.recalculateLine();
      });

      this.headingMarker.addListener('drag', () => {
        this.state.heading = this.calculateHeading();
        this.recalculateLine();
      });
    }

    initializeSearchBox() {
      const input = $(INPUT_SELECTOR)[0];
      const searchBox = new google.maps.places.SearchBox(input);
      this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

      searchBox.addListener('places_changed', () => {
        var places = searchBox.getPlaces();

        if (places.length === 0) {
          return;
        }
        // For each place, get the icon, name and location.
        var bounds = new google.maps.LatLngBounds();
        places.forEach((place) => {
          if (place.geometry.viewport) {
            // Only geocodes have viewport.
            bounds.union(place.geometry.viewport);
          } else {
            bounds.extend(place.geometry.location);
          }
        });
        this.map.fitBounds(bounds);
        this.map.setZoom(16);
      });

      this.map.addListener('bounds_changed', () => {
        searchBox.setBounds(this.map.getBounds());
      });
    }

    calculateHeading() {
      const p1 = this.marker.getPosition();
      const p2 = this.headingMarker.getPosition();
      return google.maps.geometry.spherical.computeHeading(p1, p2);
    }

    recalculateLine() {
      // Inject the heading into the POV
      var tempPov = this.streetView.getPov();
      tempPov.heading = this.state.heading || 0;
      this.streetView.setPov(tempPov);
      this.headingLine.setPath([
        this.marker.getPosition(),
        this.headingMarker.getPosition()
      ]);
    }

    updateMarkersFromState() {
      const computeOffset = google.maps.geometry.spherical.computeOffset;
      const {latitude, longitude, heading, isApproximate} = this.state;

      if(latitude && longitude) {
        const latLng = new google.maps.LatLng(latitude, longitude);
        if(isApproximate){
          this.approximateCircle.setCenter(latLng);
        }
        else {
          this.marker.setPosition(latLng);
        }
        this.map.setCenter(latLng);

        if (heading) {
          var headingLatLng = computeOffset(latLng, 100, heading);
          this.headingMarker.setPosition(headingLatLng);
          this.recalculateLine();
        }
        this.map.setZoom(LOCATION_SET_ZOOM);
      }
    }

    geocodeSuggestedLocation(address) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({
        address
      }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK) {
          const location = results[0].geometry.location;
          // const latLng = new google.maps.LatLng(location.lat(), location.lng());
          this.map.setCenter(location);
          // TODO: Consider if we really need this resize?
          // this.resize();
        }
        // Let's show the user that we have searched for this address
        $(INPUT_SELECTOR).val(address);
      });
    }

    fetchAndReset() {
      const url = location.pathname + '/json';
      $.get(url, this.state.metadata, (metadata) => {
        const location = helpers.geoTagging.getLocation(metadata);
        // Override values in state with the once we got from the helper
        Object.assign(this.state, location);
        // Once we have them, update the markers and recalculate line
        this.updateMarkersFromState();
        this.streetView.setVisible(false);
        // If no location is known, let's try geocoding an address
        if(!location || !location.latitude || !location.longitude) {
          const address = helpers.geoTagging.getAddress(metadata);
          this.geocodeSuggestedLocation(address);
        }
      }, 'json');
    }

    start() {
      // Show the overlay if it has never been closed
      if (!window.localStorage.getItem('geotagging-overlay-closed')) {
        this.$geoTagging.find(OVERLAY_SELECTOR).addClass(OVERLAY_VISIBLE_CLASS);
      }
      // Disable all buttons that can start geo-tagging
      $(START_GEO_TAGGING_SELECTOR).attr('disabled', true);
      // Expand the expandable
      expandable.expand();
      // Find all .geo-tagging blocks and make them visible
      this.$geoTagging.addClass(GEO_TAGGING_VISIBLE_CLASS);
      // Bind resizing of the map on the window resizing
      $(window).bind('resize', this.resize);
      // Hide the map if the expandable is collapsed
      expandable.bind('collapsed', this.stop);
      // Scroll to the place where the geo-tagging takes place
      // TODO: Consider that their might be multiple of these
      $('html, body').animate({
        scrollTop: this.$geoTagging.offset().top - 100
      }, 400);
      // Fetch the newest metadata and reset from that
      this.fetchAndReset();
      // Trigger a resize of the map, when the animation from adding the class
      // GEOTAGGING_VISIBLE_CLASS completes.
      setTimeout(() => {
        this.resize();
      }, 150); // The same as $anim-duration-fast
    }

    resize() {
      // Set the maps height to the same as the sibling player
      const $player = $(PLAYER_SELECTOR);
      this.$geoTagging.find(MAP_ELEMENT_SELECTOR).height($player.height());
      // Trigger a resize event and reset the center position
      var center = this.map.getCenter();
      google.maps.event.trigger(this.map, 'resize');
      this.map.setCenter(center);
    }

    stop() {
      ga('send', 'event', GA_EVENT_CATEGORY, 'Hide');
      // Unbinding event handlers
      $(window).unbind('resize', this.resize);
      expandable.unbind('collapsed', this.stop);
      // Collapse the expandable
      // TODO: Consider checking the state of expandable when showing the map to
      // be able to return to the state before geotagging started.
      expandable.collapse();
      // Remove disabled attribute from any element that can start geotagging
      $(START_GEO_TAGGING_SELECTOR).removeAttr('disabled');
      // Remove the class that shows the map
      $(GEO_TAGGING_SELECTOR).removeClass(GEO_TAGGING_VISIBLE_CLASS);
    }

    save() {
      // Don't save twice
      if(this.state.saving) {
        return;
      }
      this.state.saving = true;
      // Disable anything that might save
      this.$geoTagging.find(SAVE_GEO_TAG_SELECTOR).prop('disabled', true);
      // Set the latitude and longitude, based on the markers current position
      const position = this.marker.getPosition();
      if(position) {
        Object.assign(this.state, {
          latitude: position.lat,
          longitude: position.lng,
        });
        // Post to the API
        const url = location.pathname + '/save-geotag';
        $.post(url, this.state, () => {
          // TODO: Make this text i18n friendly
          Snackbar.info('Gemt! Tak for dit bidrag!');
          contributionCounter.contributionAdded();
          window.location.reload();
        }, 'json').fail((err, body) => {
          const message = err.responseJSON && err.responseJSON.message;
          // TODO: Make this text i18n friendly
          Snackbar.error(message || 'Der skete en fejl');
        }).always(() => {
          this.state.saving = false;
          // Re-enable anything that might save
          this.$geoTagging.find(SAVE_GEO_TAG_SELECTOR).prop('disabled', false);
        });
      } else {
        throw new Error('Expected a valid position for the marker');
      }
    }

    registerListeners() {
      // When clicking the edit button
      $(document).on('click', START_GEO_TAGGING_SELECTOR, () => {
        this.start();
      });
      // Clicking stop / cancel
      this.$geoTagging.on('click', STOP_GEOTAGGING_SELECTOR, () => {
        this.stop();
      });
      // Clicking save
      this.$geoTagging.on('click', SAVE_GEO_TAG_SELECTOR, () => {
        this.save();
      });
      this.$geoTagging.on('click', CLOSE_OVERLAY_SELECTOR, () => {
        window.localStorage.setItem('geotagging-overlay-closed', true);
        const $overlay = this.$geoTagging.find(OVERLAY_SELECTOR);
        $overlay.removeClass(OVERLAY_VISIBLE_CLASS);
      });
    }
  }

  // Register a global callback function that the Google Maps sdk will call
  // when it is done loading.
  window.initMap = () => {
    // Initialize geo tagging for every .geo-tagging element on the page
    $(GEO_TAGGING_SELECTOR).each((i, e) => {
      const $geoTagging = $(e);
      // Initialize a controller
      const controller = new GeoTaggingController($geoTagging);
    });
    // Initialize all small maps
    $(GEO_TAGGING_MINI_MAP).each((i, element) => {
      const $map = $(element);
      const latitude = parseFloat($map.data('latitude'), 10);
      const longitude = parseFloat($map.data('longitude'), 10);
      // Parse the heading if it exists
      let heading = $map.data('heading') || null;
      heading = heading ? parseFloat(heading, 10) : null;

      const options = generateMapOptions(latitude, longitude);
      options.fullscreenControl = true;
      // Initialize the map
      const map = new google.maps.Map(element, options);

      // When the miniture map is full-screened, it should recenter and rezoom
      google.maps.event.addDomListener(window, 'resize', () => {
        // Timeout is needed for the map to find its position before recenter
        setTimeout(() => {
          map.setCenter(options.center);
          map.setZoom(options.zoom);
        }, 1);
      });

      const latLng = new google.maps.LatLng(latitude, longitude);
      if($map.data('approximate') === true) {
        addApproximateCircle(map, latLng);
      } else {
        // Add a marker
        const marker = new google.maps.Marker({
          map,
          position: latLng,
          icon: '/images/camera_pin_green.png',
          clickable: false
        });

        // Add a marker indicating heading
        if(typeof(heading) === 'number') {
          addHeadingPolygon(map, latLng, heading,  50);
          addHeadingPolygon(map, latLng, heading, 100);
          addHeadingPolygon(map, latLng, heading, 150);
          addHeadingPolygon(map, latLng, heading, 200);
          addHeadingPolygon(map, latLng, heading, 250);
          addHeadingPolygon(map, latLng, heading, 300);
        }
      }

      google.maps.event.trigger(map, 'resize');
    });
  };
})(jQuery);
