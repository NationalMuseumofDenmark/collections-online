'use strict';

var path = require('path'),
    fs = require('fs'),
    _ = require('lodash'),
    Q = require('q'),
    cip = require('../services/natmus-cip'),
    es = require('../services/elasticsearch'),
    indexAsset = require('../../indexing/processing/asset'),
    config = require('../config/config'),
    google = require('../services/google-apis'),
    vision = google.vision,
    translate = google.translate,
    oxford = require('../services/project-oxford-api');

// Load the lt of blacklisted tags
const CONFIG_DIR = path.join(__dirname, '..', 'config');
const TAGS_BLACKLIST_PATH = path.join(CONFIG_DIR, 'tags-blacklist.txt');
var tagsBlacklist = fs.readFileSync(TAGS_BLACKLIST_PATH).toString().split('\n');

const MAX_GOOGLE_SUGGESTIONS = 10;

const CROWD_TAGS = '{73be3a90-a8ef-4a42-aa8f-d16ca4f55e0a}';

function googleSuggestions(imageURL) {
  // construct parameters
  const apiReq = new vision.Request({
    image: new vision.Image({
      url: imageURL
    }),
    features: [
      new vision.Feature('LABEL_DETECTION', MAX_GOOGLE_SUGGESTIONS),
      new vision.Feature('LANDMARK_DETECTION', MAX_GOOGLE_SUGGESTIONS)
    ]
  });

  // Get labels
  return vision.annotate(apiReq).then(function(apiRes) {
    var labels = apiRes.responses[0].labelAnnotations || [];
    var landmarks = apiRes.responses[0].landmarkAnnotations || [];

    labels = labels.map(function(label) {
      return label.description;
    });

    landmarks = landmarks.map(function(landmark) {
      return landmark.description;
    });

    return _.union(labels, landmarks);
  });
}

function projectOxfordSuggestions(imageURL) {
  return oxford.vision.analyzeImage({
    url: imageURL,
    visualFeatures: 'ImageType,Categories',
    ImageType: true,
    Categories: true,
    Faces: false,
    Color: false,
    Adult: false
  }).then(function(response) {
    var tags = [];
    for (var c in response.categories) {
      var name = response.categories[c].name || '';
      var parts = name.split('_');
      for (var p in parts) {
        var part = parts[p];
        tags.push(part);
      }
    }
    return tags;
  });
}

function fetchSuggestions(imageURL) {
  var suggestionsPromises = [
    googleSuggestions(imageURL),
    projectOxfordSuggestions(imageURL)
  ];

  return Q.all(suggestionsPromises).then(function(suggestedTags) {
    var deferred = Q.defer();
    var tags = _.union.apply(null, suggestedTags).filter(function(tag) {
      return tag; // Filter out undefined, null and ''
    });

    translate.translate(tags, 'en', 'da', function(err, translations) {
      if (err) {
        deferred.reject(err);
      } else {
        // The translation API returns a single value without an array wrapping
        // when a single word is sent to it.
        if (!translations.length) {
          translations = [];
        }
        translations = translations.map(function(translation) {
          // Convert the translated tag to lowercase
          return translation.translatedText.toLowerCase();
        }).filter(function(tag) {
          // Filter out blacklisted tags
          return tagsBlacklist.indexOf(tag) === -1;
        }).sort();
        deferred.resolve(_.uniq(translations));
      }
    });

    return deferred.promise;
  });
}

exports.fetchSuggestions = fetchSuggestions;

exports.suggestions = function(req, res, next) {
  var catalog = req.params.catalog;
  var id = req.params.id;
  var url = config.cipBaseURL + '/preview/thumbnail/' + catalog + '/' + id;

  fetchSuggestions(url).then(function(tags) {
    res.json({
      'tags': tags
    });
  }, next);
};

function metadataFromIndex(catalogAlias, id) {
  var idStr = catalogAlias + '-' + id;

  // Get the assets current metadata from elasticsearch.
  return es.get({
    index: config.esAssetsIndex,
    type: 'asset',
    id: idStr
  });
}

function updateIndex(metadata, tags) {
  var indexingState = {es: es};
  var allTransformations = indexAsset.METADATA_TRANSFORMATIONS;
  var transformations = allTransformations.filter(function(t) {
    // We only care about this single transformation.
    return t.name === 'transformTags';
  });

  // We can change these as they just changed in the CIP.
  metadata.tags_crowd = tags;

  return indexAsset(indexingState, metadata, transformations);
}

function saveToCip(catalog, id, values) {
  return cip.initSession().then(function(nm) {
    return cip.setFieldValues(nm, catalog, id, 'web', values)
    .then(function(response) {
      if (response.statusCode !== 200) {
        throw new Error('Failed to set the field values');
      }
    });
  });
}

exports.saveCrowdTag = function(req, res, next) {
  var catalog = req.params.catalog;
  var id = req.params.id;
  var tag = req.body.tag;
  var indexTags = '';
  var tags;
  var metadata;

  metadataFromIndex(catalog, id)
  .then(function(response) {
    metadata = response._source;
    // Let's not add undefined to the list of tags
    if (metadata.tags_crowd) {
      // Grab existing tags and get ready for adding one.
      indexTags = metadata.tags_crowd + ',';
      // Check if tag already exists
      if (metadata.tags_crowd.indexOf(tag) !== -1 ) {
        throw new Error('Emneordet "' + tag + '" eksisterer allerede');
      }
    }
    if (metadata.tags) {
      if (metadata.tags.indexOf(tag) !== -1) {
        throw new Error('Emneordet "' + tag + '" eksisterer allerede');
      }
    }
    tags = indexTags + tag;
  })
  .then(function(){
    var values = {};
    values[CROWD_TAGS] = tags;
    return saveToCip(catalog, id, values);
  })
  .then(function(){
    updateIndex(metadata, tags);
  })
  .then(function() {
    res.json({
      success: true
    });
  }, next);

  //TODO Implement remove crowd tag
};
