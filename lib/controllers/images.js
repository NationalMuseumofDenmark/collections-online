'use strict';

var querystring = require('querystring');
var config = require('../config');
var Agent = require('agentkeepalive');
var request = require('request').defaults({
  agent: new Agent({
    maxSockets: config.cip.proxyMaxSockets
  })
});

function proxy(url, res, next) {
  request
    .get(url)
    .on('error', function(err) {
      next(err);
    })
    .on('response', function(response){
      response.headers['Cache-Control'] = 'max-age=2592000';
    })
    .pipe(res);
}

exports.proxy = proxy;

exports.image = function(req, res, next) {
  var catalog = req.params.catalog;
  var id = req.params.id;
  var size = req.params.size;

  var url = config.cip.baseURL +
            '/preview/image/' +
            catalog +
            '/' +
            id +
            '/?maxsize=' +
            size;

  proxy(url, res, next);
};

exports.downloadImage = function(req, res, next) {
  var catalog = req.params.catalog;
  var id = req.params.id;
  var size = req.params.size;
  var filename = req.params.filename;

  filename = filename.replace(' ', '-').replace('/', '-');
  filename = filename.split('.')[0];
  var newFilename = filename + '_' + catalog + '-' + id + '_' + size + '.jpg';

  var url = config.cip.baseURL + '/preview/image/' + catalog + '/' + id;

  if (size !== 'original') {
    url += '/?maxsize=' + size;
  }

  proxy(url, res, next);

  res._writeHead = res.writeHead;
  res.writeHead = function(statusCode, reasonPhrase, headers) {
    res.header('content-disposition', 'download; filename=' +
               querystring.escape(newFilename));
    res._writeHead(statusCode, reasonPhrase, headers);
  };
};

exports.thumbnail = function(req, res, next) {
  var catalog = req.params.catalog;
  var id = req.params.id;
  // FIXME: This assets that the thumbnail is accessable without authentication.
  // TODO: Send through the Session ID.
  var url = config.cip.baseURL + '/preview/thumbnail/' + catalog + '/' + id;

  proxy(url, res, next);
};

exports.download = function(req, res, next) {
  var catalog = req.params.catalog;
  var id = req.params.id;
  var url = config.cip.baseURL + '/asset/download/' + catalog + '/' + id;

  proxy(url, res, next);
};
