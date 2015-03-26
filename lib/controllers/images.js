'use strict';

var querystring = require('querystring');
var config = require('../config/config');
var Agent = require('agentkeepalive');

var request = require('request').defaults({
  agent: new Agent({
    maxSockets: config.cipProxyMaxSockets
  })
});

function proxy(url, res, next) {
    request
        .get(url)
        .on('error', function(err) {
            next(err);
        })
        .pipe(res);
}

exports.image = function(req, res, next) {
    var catalog = req.params.catalog;
    var id = req.params.id;
    var size = req.params.size;

    var url = 'http://cumulus.natmus.dk/CIP/preview/image/' + catalog + '/' + id + '/?maxsize=' + size;

    proxy(url, res, next);
};

exports.download_image = function(req, res, next) {
    var catalog = req.params.catalog;
    var id = req.params.id;
    var size = req.params.size;
    var filename = req.params.filename;

    filename = filename.replace(' ', '-').replace('/', '-');
    filename = filename.split('.')[0];
    var new_filename = filename + '_' + catalog + '-' + id + '_' + size + '.jpg';

    var url = 'http://cumulus.natmus.dk/CIP/preview/image/' + catalog + '/' + id + '/?maxsize=' + size;
    
    proxy(url, res, next);

    res._writeHead = res.writeHead;
    res.writeHead = function(statusCode, reasonPhrase, headers){
      res.header('content-disposition', 'download; filename=' + querystring.escape(new_filename));
      res._writeHead(statusCode, reasonPhrase, headers);
    };
};

exports.thumbnail = function(req, res, next) {
    var catalog = req.params.catalog;
    var id = req.params.id;
    // FIXME: This assets that the thumbnail is accessable without authentication.
    // TODO: Send through the Session ID.
    // 
    var url = 'http://cumulus.natmus.dk/CIP/preview/thumbnail/' + catalog + '/' + id;

    proxy(url, res, next);
};

exports.download = function(req, res, next) {
    var catalog = req.params.catalog;
    var id = req.params.id;
    var filename = req.params.filename;
    var url = 'http://cumulus.natmus.dk/CIP/asset/download/' + catalog + '/' + id;

    proxy(url, res, next);
};
