'use strict';

var request = require('request'),
    Q = require('q'),
    cip = require('../services/natmus-cip'),
    indexing = require('../../indexing/run'),
    config = require('../config/config');

var LONGITUDE_FIELD = '{418a4c92-fe63-11d3-9030-0080ad80c556}';
var LATITUDE_FIELD = '{418a4c91-fe63-11d3-9030-0080ad80c556}';
var GOOGLE_MAPS_COORDINATES_FIELD = '{f7bb28d1-0ef1-46b5-90c8-202f90800eff}';

function updateIndex(req, catalogAlias, id, latitude, longitude) {
  var es = req.app.get('es_client');
  var idStr = catalogAlias + '-' + id;
  return es.update({
    index: config.es_assets_index,
    type: 'asset',
    id: idStr,
    body: {
      doc: {
        'google_maps_coordinates': [
            latitude,
            longitude
          ].join(', '),
        'latitude': latitude,
        'longitude': longitude
      }
    }
  });
  /*
  return indexing({
    mode: 'single',
    reference: catalogAlias +'-'+ id
  });
  */
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

  if(catalogAlias === 'FHM') {
    cip.initSession().then(function(nm) {
      return cip.getAsset(nm, catalogAlias, id).then(function(asset) {
        var googleMapsCoordinates = asset.fields[GOOGLE_MAPS_COORDINATES_FIELD];
        if(!googleMapsCoordinates || forced) {
          // Save the new coordinates to the CIP.
          var values = {};
          values[GOOGLE_MAPS_COORDINATES_FIELD] = [
            latitude, longitude
          ].join(', ');
          return cip.setFieldValues(nm, catalogAlias, id, 'web', values)
          .then(function(response) {
            if(response.statusCode !== 200) {
              throw new Error('Failed to set the field values');
            }
            return [req, catalogAlias, id, latitude, longitude];
          })
          .spread(updateIndex);
        } else {
          throw new Error('This asset already have longitude and latitude.');
        }
      });
    }).then(function(asset) {
      // done
      res.json({
        success: true
      });
    }, next);
  } else {
    next(new Error('Cannot geotag assets in this catalog.'));
  }
};
