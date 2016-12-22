'use strict';

var ds = require('../services/documents');
var config = require('../config');

var helpers = {
  thousandsSeparator: function(number) {
    return number.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1.');
  }
};

exports.frontpage = function(req, res, next) {
  ds.count({
    query: config.search.baseQuery
  }).then(function(response) {
    res.render('frontpage', {
      frontpage: true,
      totalAssets: helpers.thousandsSeparator(response.count),
      req: req
    });
  }, next);
};
