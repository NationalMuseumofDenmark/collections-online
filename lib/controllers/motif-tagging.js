'use strict';

var path = require('path'),
    fs = require('fs'),
    _ = require('lodash'),
    Q = require('q'),
    config = require('../config/config'),
    google = require('../services/natmus-cip'),
    google = require('../services/google-apis'),
    vision = google.vision,
    translate = google.translate,
    oxford = require('../services/project-oxford-api');

// Load the lt of blacklisted tags
const CONFIG_DIR = path.join(__dirname, '..', 'config');
const TAGS_BLACKLIST_PATH = path.join(CONFIG_DIR, 'tags-blacklist.txt');
var tagsBlacklist = fs.readFileSync(TAGS_BLACKLIST_PATH).toString().split('\n');

const MAX_GOOGLE_SUGGESTIONS = 10;

function googleSuggestions(imageURL) {

  // construct parameters
  const apiReq = new vision.Request({
    image: new vision.Image({ url: imageURL }),
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
    for(var c in response.categories) {
      var name = response.categories[c].name || '';
      var parts = name.split('_');
      for(var p in parts) {
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
      if(err) {
        deferred.reject(err);
      } else {
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
      "tags": tags
    });
  }, next);
};
