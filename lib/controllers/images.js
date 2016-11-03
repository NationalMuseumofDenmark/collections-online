'use strict';
var plugins = require('../../plugins');
var config = require('../config');
var es = require('collections-online/lib/services/elasticsearch');
var Q = require('q');
var fs = require('fs');
var path = require('path');
var Canvas = require('canvas');
var Image = Canvas.Image;
const Transform = require('stream').Transform;

var imageController = plugins.getFirst('image-controller');
if(!imageController) {
  throw new Error('Expected at least one image controller!');
}

const POSSIBLE_SIZES = config.thumbnailSizes;
const WATERMARK_SCALE = 0.33; // 20% of the width of the thumbnail
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

var FALLBACK_PATH = path.normalize(config.appDir + '/images/fallback.png');

const contentDispositionRegexp = /.*\.([^.]+)$/i;

exports.download = function(req, res, next) {
  var collection = req.params.collection;
  var id = req.params.id;
  var size = req.params.size;

  if (size && POSSIBLE_SIZES.indexOf(size) === -1) {
    throw new Error('The size is required and must be one of ' +
                    POSSIBLE_SIZES +
                    ' given: "' + size + '"');
  }

  var proxyRequest = imageController.proxyDownload(collection + '/' + id, {
    options: size
  });

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
    if(size) {
      // Remove JPEG from e.g. kbh-museum-26893-originalJPEG.jpg
      size = size.replace('JPEG', '');
      size = '-' + size;
    }
    // Generating a new filename adding size if it exists
    var filename = collection + '-' + id + size + extension;
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

function bottomRightPosition(img, watermarkImg) {
  var watermarkRatio = watermarkImg.height / watermarkImg.width;

  var watermarkWidth = img.width * WATERMARK_SCALE;
  var watermarkHeight = watermarkWidth * watermarkRatio;

  return {
    left: img.width - watermarkWidth,
    top: img.height - watermarkHeight,
    width: watermarkWidth,
    height: watermarkHeight
  };
}

function middleCenterPosition(img, watermarkImg) {
  var watermarkRatio = watermarkImg.height / watermarkImg.width;

  var watermarkWidth = img.width * WATERMARK_SCALE;
  var watermarkHeight = watermarkWidth * watermarkRatio;

  return {
    left: img.width/2 - watermarkWidth / 2,
    top: img.height/2 - watermarkHeight / 2,
    width: watermarkWidth,
    height: watermarkHeight
  };
}

const POSITION_FUNCTIONS = {
  'middle-center': middleCenterPosition,
  'bottom-right': bottomRightPosition
};

function watermarkTransformation(watermarkBuffer, maxSize, positionFunction) {
  var imageData = [];
  return new Transform({
    transform(chunk, encoding, callback) {
      imageData.push(chunk);
      callback();
    },
    flush: function(callback) {
      var img = new Image;
      img.src = Buffer.concat(imageData);

      // Cap the maxSize at the largest of the width and height to avoid
      // stretching beyound the original image
      maxSize = Math.min(maxSize, Math.max(img.width, img.height));

      var ratio = img.width / img.height;
      var newSize = {
        width: ratio >= 1 ? maxSize : maxSize * ratio,
        height: ratio < 1 ? maxSize : maxSize / ratio,
      };

      var canvas = new Canvas(newSize.width, newSize.height);
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, newSize.width, newSize.height);

      // If both a watermark buffer and position is defined, we can draw it
      if(watermarkBuffer && positionFunction) {
        var watermarkImg = new Image;
        watermarkImg.src = watermarkBuffer;
        var position = positionFunction(newSize, watermarkImg);
        // Draw the watermark in the
        ctx.drawImage(watermarkImg,
                      position.left,
                      position.top,
                      position.width,
                      position.height);
      }

      // Size of the jpeg stream is just ~ 15% of the raw PNG buffer
      canvas.jpegStream()
      .on('data', (chuck) => {
        this.push(chuck);
      })
      .on('end', () => {
        callback();
      });
    }
  });
}

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

  // Let's find out what the license on the asset is
  es.getSource({
    index: config.es.assetsIndex,
    type: 'asset',
    id: collection + '-' + id // TODO: Change '-' to '/asset/'
  })
  .then(function(metadata) {
    var proxyRequest = imageController.proxyThumbnail(collection + '/' + id, next);

    // Apply the watermark if the config's licenseMapping states it
    var doWatermark = !metadata.license ||
                      WATERMARKED_LICENSE_IDS.indexOf(metadata.license.id) > -1;
    // We should only apply the watermark when the size is large
    doWatermark = doWatermark &&
                  size > THUMBNAIL_SIZE &&
                  config.features.watermarks;
    var watermark = null;
    var positionFunction = null;
    if (doWatermark && collection in WATERMARK_BUFFERS) {
      watermark = WATERMARK_BUFFERS[collection];
      positionFunction = POSITION_FUNCTIONS[position];
    }
    var transformation = watermarkTransformation(watermark, size, positionFunction);

    proxyRequest
    .on('error', next)
    .on('response', function(response) {
      if(response.statusCode === 200) {
        proxyRequest.pipe(transformation).pipe(res);
      } else {
        res.type('png');
        getErrorPlaceholderStream().pipe(res);
      }
    });
  }).then(null, next);
};
