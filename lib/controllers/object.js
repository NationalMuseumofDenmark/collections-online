var natmusApi = require('../services/natmus-api'),
    Q = require('q');

var collections = require('../config/collections.json');
var fields = require('../config/objectFields.json');

var coreFields = [
  'id',
  'objectIdentification',
  'collection',
  'protocolPrefix',
  'protocolVolume',
  'protocolSuffix',
  'protocolPage',
  'workDescription'
];

var blacklistedFields = [
  'protocolText', // This field is extracted explicitly.
  'publiclyAvailable', // These will always be true if they are visible.
  'type',
  'assets',
];

function buildField(fieldKey, objectMetadata) {
  if(fields[fieldKey]) {
    return {
      name: fields[fieldKey].name || fieldKey,
      description: fields[fieldKey].description || '',
      value: objectMetadata[fieldKey]
    };
  } else {
    return {
      name: fieldKey,
      description: '',
      value: objectMetadata[fieldKey]
    };
  }
}

function buildMetadataSections(objectMetadata) {
  var sections = {
    core: {
      name: 'Grundlæggende oplysninger',
      fields: []
    },
    additional: {
      name: 'Yderligere oplysninger',
      fields: [],
      collapsable: true,
      initiallyCollapsed: true
    }
  };

  // Push all core fields available on the objects metadata.
  coreFields.filter(function(fieldKey) {
    return fieldKey in objectMetadata && blacklistedFields.indexOf(fieldKey) === -1;
  }).forEach(function(fieldKey) {
    sections.core.fields.push(buildField(fieldKey, objectMetadata));
  });

  // Push all additional fields available on the objects metadata, which is not
  // a part of the described core fields.
  Object.keys(objectMetadata).filter(function(fieldKey) {
    return coreFields.indexOf(fieldKey) === -1 && blacklistedFields.indexOf(fieldKey) === -1;
  }).forEach(function(fieldKey) {
    sections.additional.fields.push(buildField(fieldKey, objectMetadata));
  });

  return sections;
}

function generateTitle(objectMetadata) {
  var result = [];
  
  // The material.length > 1 is to fix an issue where material is 'Æ'
  // See KMM/1224
  if(objectMetadata.material && objectMetadata.material.length > 1) {
    result.push(objectMetadata.material);
  }

  if(objectMetadata.workDescription) {
    // Make sure that the description is lower-case.
    result.push(objectMetadata.workDescription.toLowerCase());
  }

  // Agregate a slash-seperated list of places that this object have been found
  // or is associated. The places.indexOf( ... ) makes sure we only include a
  // place once.
  var places = [];
  if(objectMetadata.findPlace) {
    places.push(objectMetadata.findPlace);
  }
  if(objectMetadata.coinPlace && places.indexOf(objectMetadata.coinPlace) === -1) {
    places.push(objectMetadata.coinPlace);
  }
  if(objectMetadata.nation && places.indexOf(objectMetadata.nation) === -1) {
    places.push(objectMetadata.nation);
  }
  // If any places were found, join these with slashes, and add it to the title.
  if(places.length > 0) {
    result.push('fra ' + places.join('/'));
  }

  result = result.join(' ');
  if(result.length === 0) {
    return 'Object uden titel';
  } else {
    // Make the first char upper-case.
    result = result[0].toUpperCase() + result.substring(1);
    return result;
  }
}

var transformations = [
  {
    precondition: function(item) {
      /* // Use this implementation to show only FP-I protocol pages.
      var isObject = item.type.toLowerCase() === 'object';
      var isCoin = isObject && item.collection === 'KMM';
      var inFP = item.protocolPrefix === 'FP';
      var inVolumeI = item.protocolVolume === 'I';
      var hasProtocolPage = item.protocolPage > 0;
      return isCoin && inFP && inVolumeI && hasProtocolPage;
      */
      var isObject = item.type.toLowerCase() === 'object';
      var isCoin = isObject && item.collection === 'KMM';
      var hasProtocolPrefix = !!item.protocolPrefix;
      var hasProtocolVolume = !!item.protocolVolume;
      var hasProtocolPage = item.protocolPage > 0;
      return isCoin && hasProtocolPrefix && hasProtocolVolume && hasProtocolPage;
    },
    transform: function(item) {
      // These has a filename like "FPI_0001.tif"
      var protocolFilename = item.protocolPrefix + item.protocolVolume + '_';
      var paddedProtocolPage = item.protocolPage.toString();
      while(paddedProtocolPage.length < 4) {
        paddedProtocolPage = '0' + paddedProtocolPage;
      }
      protocolFilename += paddedProtocolPage+'.tif';

      return natmusApi.request('Search', 'GET', {
        query: natmusApi.and({
          type: 'asset',
          fileName: protocolFilename
        })
      }).then(function(result) {
        result.Results.forEach(function(asset) {
          item.assets.push({
            sourceId: asset.sourceId,
            source: asset.source,
            collection: asset.collection
          });
        });
        return item;
      });
    }
  }
];

function applyTransformations(item) {
  var promise = new Q(item);

  transformations.forEach(function(t) {
    promise = promise.then(function (item) {
      if(t.precondition(item)) {
        return t.transform(item);
      } else {
        return item;
      }
    });
  });

  return promise;
}

exports.index = function(req, res, next) {
  var collection = req.params.collection;
  var id = req.params.id;

  natmusApi.getObject(collection, id)
  .then(function(objectMetadata) {
    // The object was not found if it's not publically available.
    if(!objectMetadata.publiclyAvailable) {
      throw new Error('No object found');
    }
    return objectMetadata;
  })
  .then(applyTransformations)
  .then(function(objectMetadata) {

    // So far, we only know how to deal with assets from Cumulus.
    objectMetadata.assets = objectMetadata.assets.filter(function(asset) {
      return asset.source === 'Cumulus';
    });

    function buildAssetURLs(asset, maxsize) {
      if(asset) {
        return {
          'src': '/' + [asset.collection, asset.sourceId, 'image', maxsize].join('/'),
          'href': '/' + [asset.collection, asset.sourceId].join('/')
        };
      } else {
        return undefined;
      }
    }

    var primaryAsset = buildAssetURLs(objectMetadata.assets[0], 1200);

    var renderParamenters = {
      item: {
        title: generateTitle(objectMetadata),
        description: objectMetadata.protocolText,
        type: objectMetadata.type.toLowerCase(), // TODO: Remove the toLowerCase
        collection: objectMetadata.collection,
        collectionName: collections[objectMetadata.collection] || objectMetadata.collection,
        metadataSections: buildMetadataSections(objectMetadata),
        assets: {
          primary: primaryAsset,
          visible: objectMetadata.assets.slice(1, 5).map(function(asset) {
            return buildAssetURLs(asset, 300);
          }),
          extra: objectMetadata.assets.slice(5).map(function(asset) {
            return buildAssetURLs(asset, 300);
          })
        }
      },
      req: req
    };

    return renderParamenters;
  })
  .then(function(renderParamenters) {
    res.render('item.jade', renderParamenters);
  })
  .then(undefined, function(error) {
    if(error.message === 'No object found') {
      res.status(404);
      res.render('404.jade', { 'req': req });
    } else {
      res.status(500);
      next(error);
    }
  });
};

/**
 * A route specifically added to generate some links of interesting coins that
 * have is a part of the "FP" volume "I".
 */
exports.interestingCoins = function(req, res, next) {
  natmusApi.request('Search', 'GET', {
    query: natmusApi.and({
      type: 'object',
      protocolPrefix: 'FP',
      protocolVolume: 'I',
      //_exists_: 'assets',
      //source: 'GenReg',
      //collection: 'KMM',
    }),
    size: 1000
  }).then(function(result) {
    var links = result.Results.map(function(object) {
      var href = '/objects/'+ object.collection +'/'+ object.sourceId;
      return '<a href="' +href+ '">' +object.collection+'/'+object.sourceId+ '</a>';
    }).map(function(link) {
      return '<li>' + link + '</li>';
    });
    res.send('<h1>Interesting objects</h1><ul>' + links.join('\n') + '</ul>');
  }, next);
};
