'use strict';

const keystone = require('keystone');
const ds = require('../services/documents');
const config = require('../config');

var helpers = {
  thousandsSeparator: function(number) {
    return number.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1.');
  }
};

exports.frontpage = function(req, res, next) {
  if ('q' in req.query) {
    next();
  } else {
    keystone.list('Gallery').model.find()
    .populate('items')
    .sort('order')
    .exec(function(err, galleries) {
      if(!err) {
        ds.count({
          body: {
            query: config.search.baseQuery
          }
        }).then(function(response) {
          res.render('frontpage', {
            galleries,
            frontpage: true,
            totalAssets: helpers.thousandsSeparator(response.count),
            req: req
          });
        }, next);
      } else {
        next(err);
      }
    });
  }
};
