'use strict';

var request = require('request'),
    Q = require('q'),
    cip = require('../services/natmus-cip'),
    indexAsset = require('../../indexing/processing/asset'),
    config = require('../config/config');

var LONGITUDE_FIELD = '{418a4c92-fe63-11d3-9030-0080ad80c556}';
var LATITUDE_FIELD = '{418a4c91-fe63-11d3-9030-0080ad80c556}';
var GOOGLE_MAPS_COORDS_FIELD = '{f7bb28d1-0ef1-46b5-90c8-202f90800eff}';
var GOOGLE_MAPS_COORDS_CROWD_FIELD = '{81780c19-86be-44e6-9eeb-4e63f16d7215}';

function updateIndex(req, catalogAlias, id, latitude, longitude) {
  var es = req.app.get('es_client');
  var idStr = catalogAlias + '-' + id;

  // Get the assets current metadata from elasticsearch.
  return es.get({
    index: config.es_assets_index,
    type: 'asset',
    id: idStr
  }).then(function(response) {
    var indexingState = {es: es};
    var metadata = response._source;
    console.log(metadata);
    var transformations = indexAsset.METADATA_TRANSFORMATIONS.filter(function(t) {
      // We only care about this single transformation.
      return t.name === 'derive_latitude_and_longitude';
    });

    // We can change these as they just changed in the CIP.
    metadata.google_maps_coordinates_crowd = [latitude, longitude].join(', ');

    return indexAsset(indexingState, metadata, transformations);
  });
}

exports.save = function (req, res, next) {
  // Check with the CIP to ensure that the asset has not already been geotagged.
  var catalogAlias = req.params.catalog;
  var id = req.params.id;
  var forced = req.body.force === 'true';
  var latitude = parseFloat(req.body.latitude);
  var longitude = parseFloat(req.body.longitude);

  if(!config.enableGeotagging) {
    throw new Error('Geotagging is disabled.');
  }

  // Save the new coordinates to the CIP.
  var values = {};
  values[GOOGLE_MAPS_COORDS_CROWD_FIELD] = [
    latitude, longitude
  ].join(', ');

  return cip.initSession().then(function(nm) {
    return cip.setFieldValues(nm, catalogAlias, id, 'web', values)
    .then(function(response) {
      if(response.statusCode !== 200) {
        throw new Error('Failed to set the field values');
      }
      return [req, catalogAlias, id, latitude, longitude];
    })
    .spread(updateIndex);
  }).then(function(asset) {
    // done
    res.json({
      success: true
    });
  }, next);
};
