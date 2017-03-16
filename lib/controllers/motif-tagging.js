'use strict';

let path = require('path');
let fs = require('fs');
let _ = require('lodash');
let Q = require('q');
let ds = require('../services/documents');
let config = require('../config');
let google = require('../services/google-apis');
let vision = google.vision;
let translate = google.translate;
let oxford = require('../services/project-oxford-api');

const plugins = require('../../plugins');
const motifTagController = plugins.getFirst('motif-tag-controller');
if(!motifTagController) {
  throw new Error('Expected at least one image controller!');
}

const MAX_GOOGLE_SUGGESTIONS = 10;

function googleSuggestions(imageURL) {
  // construct parameters
  const apiReq = {
    image: {
      source: {
        imageUri: imageURL
      }
    },
    features: [
      {type: 'LABEL_DETECTION', maxResults: MAX_GOOGLE_SUGGESTIONS},
      {type: 'LANDMARK_DETECTION', maxResults: MAX_GOOGLE_SUGGESTIONS}
    ]
  };

  // Get labels
  return vision.annotate(apiReq).then(function(response) {
    const annotations = response[0];
    const apiResponse = response[1];

    // Extract the labels and landmarks
    var labels = annotations[0].labelAnnotations || [];
    var landmarks = annotations[0].landmarkAnnotations || [];

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

/**
 * @param imageUrl string of an absolute public URL to the image
 * @param apiFilter object of the API's to use with a boolean or a function, as
 *    the value. If the apiFilter value is a falsy it won't be going filtering
 *    which means all API's are used
 **/
function fetchSuggestions(imageURL, apiFilter) {
  var suggestionAPIs = {
    google: googleSuggestions,
    oxford: projectOxfordSuggestions
  };

  var suggestionsPromises = [];
  for (var apiKey in suggestionAPIs) {
    if (!apiFilter || apiFilter[apiKey] === true ||
       typeof apiFilter[apiKey] === 'function' &&
         apiFilter[apiKey](imageURL) === true) {

      suggestionsPromises.push(suggestionAPIs[apiKey](imageURL));
    }
  }

  return Q.all(suggestionsPromises).then(function(suggestedTags) {
    var deferred = Q.defer();
    var tags = _.union.apply(null, suggestedTags).filter(function(tag) {
      return !!tag; // Filter out undefined, null and ''
    });

    if (tags.length === 0) {
      deferred.resolve();
    } else {
      translate.translate(tags, {
        from: 'en',
        to: 'da'
      }, function(err, translations) {
        if (err) {
          deferred.reject(err);
        } else {
          // The translation API returns a single value without an array
          // wrapping when a single word is sent to it.
          if (!translations.length) {
            translations = [];
          }
          translations = translations.map(function(translation) {
            // Convert the translated tag to lowercase
            return translation.toLowerCase();
          }).filter(function(tag) {
            // Filter out blacklisted tags
            return config.tagsBlacklist.indexOf(tag) === -1;
          }).sort();
          deferred.resolve(_.uniq(translations));
        }
      });
    }

    return deferred.promise;
  });
}

exports.fetchSuggestions = fetchSuggestions;

exports.suggestions = function(req, res, next) {
  var collection = req.params.collection;
  var id = req.params.id;
  var url = config.cip.baseURL + '/preview/thumbnail/' + collection + '/' + id;

  fetchSuggestions(url).then(function(tags) {
    res.json({
      'tags': tags
    });
  }, next);
};

// TODO: Implement a different way of saving tags which fetch the document first
exports.saveCrowdTag = function(req, res, next) {
  var collection = req.params.collection;
  var id = req.params.id;
  var tags = req.body.tag;

  motifTagController.save({
    collection,
    id
  }, tags)
  .then(response => {
    return {
      collection,
      id
    };
  })
  .then(motifTagController.updateIndex)
  .then(function(result) {
    res.json(result);
  }, next);
};

exports.typeaheadSuggestions = function(req, res, next) {
  let text = req.query.text || '';
  text = text.toLowerCase();
  return motifTagController.typeaheadSuggestions(text).then(suggestions => {
    res.json(suggestions);
  }, next);
};
