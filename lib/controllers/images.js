'use strict';

var querystring = require('querystring');
var request = require('request');

exports.image = function(req, res) {
    var catalog = req.params.catalog;
    var id = req.params.id;
    var size = req.params.size;

    var url = 'http://cumulus.natmus.dk/CIP/preview/image/' + catalog + '/' + id + '/?maxsize=' + size;
    request.get(url).pipe(res);
};

exports.download_image = function(req, res) {
    var catalog = req.params.catalog;
    var id = req.params.id;
    var size = req.params.size;
    var filename = req.params.filename;

    filename = filename.replace(' ', '-');
    filename = filename.split('.')[0];
    var new_filename = filename + '_' + catalog + '-' + id + '_' + size + '.jpg';

    var url = 'http://cumulus.natmus.dk/CIP/preview/image/' + catalog + '/' + id + '/?maxsize=' + size;
    request.get(url).pipe(res);

    res._writeHead = res.writeHead;
    res.writeHead = function(statusCode, reasonPhrase, headers){
      res.header('content-disposition', 'download; filename=' + querystring.escape(new_filename));
      res._writeHead(statusCode, reasonPhrase, headers);
    };
};

exports.thumbnail = function(req, res) {
    var catalog = req.params.catalog;
    var id = req.params.id;

    var url = 'http://cumulus.natmus.dk/CIP/preview/thumbnail/' + catalog + '/' + id;
    request.get(url).pipe(res);
};

exports.download = function(req, res) {
    var catalog = req.params.catalog;
    var id = req.params.id;
    var filename = req.params.filename;
    var url = 'http://cumulus.natmus.dk/CIP/asset/download/' + catalog + '/' + id;

    request.get(url).pipe(res);

};
