'use strict';
const plugins = require('../../plugins');
const config = require('../config');
const Q = require('q');
const fs = require('fs');
const path = require('path');
const waterStream = require('water-stream');
const helpers = require('../../shared/helpers');
const ds = require('../services/documents');

// Set the cache ttl from the configuration
waterStream.cached.config({
  stdTTL: (config.cache && config.cache.ttl) || 60*5 // Default is five minutes
});

const imageController = plugins.getFirst('image-controller');
if(!imageController) {
  throw new Error('Expected at least one image controller!');
}

const documentController = require('./document');

const POSSIBLE_SIZES = config.thumbnailSizes;
const THUMBNAIL_SIZE = 350;

var WATERMARK_BUFFERS = {};
Object.keys(config.watermarks || {}).forEach((catalog) => {
  var path = config.watermarks[catalog];
  WATERMARK_BUFFERS[catalog] = fs.readFileSync(path);
});

var FALLBACK_PATH = path.join(config.childPath,
                              'app',
                              'images',
                              'fallback_not_public.png');

const contentDispositionRegexp = /.*\.([^.]+)$/i;

exports.download = function(req, res, next) {
  var collection = req.params.collection;
  var id = req.params.id;
  var size = req.params.size;

  var params = {};
  if (size && POSSIBLE_SIZES && POSSIBLE_SIZES.indexOf(size) === -1) {
    throw new Error('The size is required and must be one of ' +
                    POSSIBLE_SIZES +
                    ' given: "' + size + '"');
  }

  var proxyRequest = imageController.proxyDownload(collection + '/' + id, size);

  res._writeHead = res.writeHead;
  res.writeHead = function(statusCode, reasonPhrase, headers) {
    if(statusCode === 200 && proxyRequest.response) {
      // Reading the file extension from the response from CIP
      var resHeaders = proxyRequest.response.headers || {};
      var contentDisposition = resHeaders['content-disposition'] || '';
      // Determine the file extension extension
      if(contentDisposition) {
        var parts = contentDisposition.match(contentDispositionRegexp);
        var extension;
        if(parts) {
          extension = '.' + parts[1];
        } else {
          extension = '.jpg'; // Default: When the CIP is not responsing
        }
        // Build the filename
        var filename = collection + '-' + id;
        if(size) {
          // Remove JPEG from e.g. kbh-museum-26893-originalJPEG.jpg
          filename += '-' + size.replace('JPEG', '');
        }
        // Generating a new filename adding size if it exists
        filename += extension;
        // Write the header
        res.set('content-disposition', 'attachment; filename=' + filename);
      }
    }
    var filename = collection + '-' + id;
    if(size) {
      // Remove JPEG from e.g. kbh-museum-26893-originalJPEG.jpg
      filename += '-' + size.replace('JPEG', '');
    }
    // Generating a new filename adding size if it exists
    filename += extension;
    res.header('content-disposition', 'attachment; filename=' + filename);
    res._writeHead(statusCode, reasonPhrase, headers);
  };

  proxyRequest
  .on('error', next)
  .on('response', function(response) {
    if(response.statusCode === 200) {
      proxyRequest.pipe(res);
    } else {
      res.type('png');
      getErrorPlaceholderStream().pipe(res);
    }
  });
};

const POSITION_FUNCTIONS = {
  'middle-center': waterStream.middleCenterPosition,
  'bottom-right': waterStream.bottomRightPosition
};

function getErrorPlaceholderStream() {
  return fs.createReadStream(FALLBACK_PATH);
}

exports.thumbnail = function(req, res, next) {
  var collection = req.params.collection;
  var id = req.params.id;
  var size = req.params.size ? parseInt(req.params.size, 10) : THUMBNAIL_SIZE;
  var position = req.params.position || 'middle-center';
  if(!(position in POSITION_FUNCTIONS)) {
    throw new Error('Unexpected position function: ' + position);
  }
  const positionFunction = POSITION_FUNCTIONS[position];

  function respond(watermark) {
    const proxyReq = imageController.proxyThumbnail(
      collection + '/' + id, next
    );
    proxyReq
    .on('error', next)
    .on('response', function(response) {
      if(response.statusCode === 200) {
        var t = waterStream.transformation(watermark, size, positionFunction);
        proxyReq.pipe(t).pipe(res);
      } else {
        res.type('png');
        getErrorPlaceholderStream().pipe(res);
      }
    });
  }

  if(config.features.watermarks) {
    documentController.get(req, 'asset').then(function(metadata) {
      const isWatermarkRequired = helpers.isWatermarkRequired(metadata);
      if (isWatermarkRequired && collection in WATERMARK_BUFFERS) {
        respond(WATERMARK_BUFFERS[collection]);
      } else {
        respond(null);
      }
    }).then(null, (err) => {
      if(err.status === 404) {
        getErrorPlaceholderStream().pipe(res);
      } else {
        throw err; // Rethrow the error
      }
    }).then(null, next);
  } else {
    respond(null);
  }
};
