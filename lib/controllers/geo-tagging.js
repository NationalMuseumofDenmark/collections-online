'use strict';

var request = require('request');
var Q = require('q');
var config = require('../config');

const plugins = require('../../plugins');
const geoTagController = plugins.getFirst('geo-tag-controller');
if(!geoTagController) {
  throw new Error('Expected at least one image controller!');
}

function deg(w) {
  w = w % 360;
  return w < 0 ? w + 360 : w;
}

exports.save = function(req, res, next) {
  // Check with the CIP to ensure that the asset has not already been geotagged.
  var collection = req.params.collection;
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
  // TODO: Save and update index
  return new Q({
    coords,
    heading,
    collection,
    id
  })
  .then(geoTagController.save)
  .then(geoTagController.updateIndex)
  .then(function() {
    // done
    res.json({
      success: true
    });
  }, next);
};
