'use strict';

exports.index = function index(req, res) {
    res.render('search', { req: req });
};

exports.catalog = function catalog(req, res) {
    res.render('search', { req: req });
};

