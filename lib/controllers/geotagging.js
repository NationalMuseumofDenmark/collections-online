'use strict';

var request = require('request');
var cip = require('../services/natmus-cip');
var Q = require('q');

var LONGITUDE_FIELD = '{418a4c92-fe63-11d3-9030-0080ad80c556}';
var LATITUDE_FIELD = '{418a4c91-fe63-11d3-9030-0080ad80c556}';

function updateIndex(catalogAlias, id) {
  return;
}

exports.save = function (req, res, next) {
  // Check with the CIP to ensure that the asset has not already been geotagged.
  var catalogAlias = req.params.catalog;
  var id = req.params.id;
  if(catalogAlias === 'FHM') {
    cip.init_session().then(function(nm) {
      return cip.getAsset(nm, catalogAlias, id).then(function(asset) {
        var longitude = asset.fields[LONGITUDE_FIELD];
        var latitude = asset.fields[LATITUDE_FIELD];
        if(!longitude && !latitude) {
          // Save the new coordinates to the CIP.
          return cip.setFieldValues(nm, catalogAlias, id, 'web', {
            longitude: req.body.longitude,
            latitude: req.body.latitude
          }).then(updateIndex);
        } else {
          throw new Error('This asset already have longitude and latitude.');
        }
      });
    }).then(function(asset) {
      // done
      res.end({
        success: true
      });
    }, next);
  } else {
    next(new Error('Cannot geotag assets in this catalog.'));
  }
};
