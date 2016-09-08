'use strict';

var request = require('request'),
    Q = require('q'),
    cip = require('../services/cip'),
    es = require('../services/elasticsearch'),
    indexAsset = require('../../indexing/processing/asset'),
    config = require('../config');

var GOOGLE_MAPS_COORDS_CROWD_FIELD = '{81780c19-86be-44e6-9eeb-4e63f16d7215}';
var HEADING_FIELD = '{ef236a08-62f8-485f-b232-9771792d29ba}';

function deg(w) {
  w = w % 360;
  return w < 0 ? w + 360 : w;
}

function updateIndex(req, catalogAlias, id, latitude, longitude, heading) {
  var idStr = catalogAlias + '-' + id;

  // Get the assets current metadata from elasticsearch.
  return es.get({
    index: config.esAssetsIndex,
    type: 'asset',
    id: idStr
  }).then(function(response) {
    var indexingState = {
      es: es,
      index: config.esAssetsIndex
    };
    var metadata = response._source;

    var transformations = [
      require('../../indexing/transformations/latitude-longitude')
    ];

    // We can change these as they just changed in the CIP.
    metadata.google_maps_coordinates_crowd = [latitude, longitude].join(', ');
    metadata.heading = heading;

    return indexAsset(indexingState, metadata, transformations);
  });
}

exports.save = function(req, res, next) {
  // Check with the CIP to ensure that the asset has not already been geotagged.
  var catalogAlias = req.params.catalog;
  var id = req.params.id;
  var latitude = parseFloat(req.body.latitude);
  var longitude = parseFloat(req.body.longitude);
  // Checking if heading is a key in the body, as a valid heading can be 0.
  // Heading is also converted to a degree between 0 and 360
  var heading = 'heading' in req.body ?
      deg(parseFloat(req.body.heading)) :
      null;

  if (!config.features.geotagging) {
    throw new Error('Geotagging is disabled.');
  }

  // Save the new coordinates to the CIP.
  var coords = [latitude, longitude];

  var values = {};
  values[GOOGLE_MAPS_COORDS_CROWD_FIELD] = coords.join(', ');
  values[HEADING_FIELD] = heading;

  return cip.setFieldValues(catalogAlias, id, 'web', values)
  .then(function(response) {
    if (response.statusCode !== 200) {
      throw new Error('Failed to set the field values');
    }
    // TODO: Consider not returning anything - as it's not used.
    return [req, catalogAlias, id, latitude, longitude, heading];
  })
  .spread(updateIndex)
  .then(function() {
    // done
    res.json({
      success: true
    });
  }, next);
};
