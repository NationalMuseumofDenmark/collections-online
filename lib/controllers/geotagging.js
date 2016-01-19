'use strict';

var request = require('request');
var cip = require('../cip-methods');

exports.save = function (req, res, next) {
  // Check with the CIP to ensure that the asset has not already been geotagged.
  var catalog_alias = req.params.catalog;
  var id = req.params.id;
  //cip.get_asset();
  res.end(['not implemented', catalog_alias, id].join(' '));
};
