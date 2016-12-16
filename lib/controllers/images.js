'use strict';
var plugins = require('../../plugins');
var config = require('../config');
var Q = require('q');
var fs = require('fs');
var path = require('path');
var waterStream = require('water-stream');

const documentController = require('./document');

const imageController = plugins.getFirst('image-controller');
if(!imageController) {
  throw new Error('Expected at least one image controller!');
}

const POSSIBLE_SIZES = config.thumbnailSizes;
const THUMBNAIL_SIZE = 350;

// Looping through the licenses to find the on
const WATERMARKED_LICENSE_IDS = config.licenseMapping
.map((license, licenseId) => {
  return {
    id: licenseId,
    watermark: license && license.watermark
  };
})
.filter(license => license.watermark)
.map(license => license.id);

var WATERMARK_BUFFERS = {};
Object.keys(config.watermarks || {}).forEach((catalog) => {
  var path = config.watermarks[catalog];
  WATERMARK_BUFFERS[catalog] = fs.readFileSync(path);
});

var FALLBACK_PATH = path.join(config.childPath,
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
    // Reading the file extension from the response from CIP
    var responseHeaders = proxyRequest.response.headers;
    var contentDispositionHeader = responseHeaders['content-disposition'] || '';
    var extension = contentDispositionHeader.match(contentDispositionRegexp);
    if(extension) {
      extension = '.' + extension[1];
    } else {
      extension = '.jpg'; // Default extension, when the CIP is not responsing
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
  const collection = req.params.collection;
  const id = req.params.id;
  const size = req.params.size ? parseInt(req.params.size, 10) : THUMBNAIL_SIZE;
  const proxyRequest = imageController.proxyThumbnail(collection + '/' + id, next);

  const position = req.params.position || 'middle-center';
  let positionFunction = null;
  if(!(position in POSITION_FUNCTIONS)) {
    throw new Error('Unexpected position function: ' + position);
  } else {
    positionFunction = POSITION_FUNCTIONS[position];
  }

  function respond(watermark) {
    proxyRequest
    .on('error', next)
    .on('response', function(response) {
      if(response.statusCode === 200) {
        var t = waterStream.transformation(watermark, size, positionFunction);
        proxyRequest.pipe(t).pipe(res);
      } else {
        res.type('png');
        getErrorPlaceholderStream().pipe(res);
      }
    });
  }

  if(config.features.watermarks) {
    documentController.get(req, 'asset').then(function(metadata) {
      // If no license is known or the configuration states it
      let requiredByLicense = !metadata.license || WATERMARKED_LICENSE_IDS.indexOf(metadata.license.id) > -1;
      // We should only apply the watermark when the size is large
      let isLarge = size > THUMBNAIL_SIZE;
      if (requiredByLicense && isLarge && collection in WATERMARK_BUFFERS) {
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
