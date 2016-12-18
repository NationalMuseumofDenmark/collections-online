'use strict';

var ds = require('../services/documents');
var config = require('../config');

exports.frontpage = function(req, res, next) {
  ds.count({
    query: config.search.baseQuery
  }).then(function(response) {
    res.render('frontpage', {
      frontpage: true,
      totalAssets: helpers.thousandsSeparator(response.count),
      req: req
    });
  });
};
