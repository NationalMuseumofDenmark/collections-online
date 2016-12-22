'use strict';

const ds = require('../services/documents');
const config = require('../config');
const helpers = require('../../shared/helpers');

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
