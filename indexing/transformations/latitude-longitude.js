'use strict';

module.exports = function(state, metadata) {
  var coordinates;
  if (metadata.google_maps_coordinates) {
    coordinates = metadata.google_maps_coordinates;
  } else if (metadata.google_maps_coordinates_crowd) {
    coordinates = metadata.google_maps_coordinates_crowd;
  }
  if (coordinates) {
    coordinates = coordinates.split(',').map(parseFloat);
    if (coordinates.length >= 2) {
      metadata.latitude = coordinates[0];
      metadata.longitude = coordinates[1];
    } else {
      throw new Error('Encountered unexpected coordinate format.');
    }
  }
  return metadata;
};
