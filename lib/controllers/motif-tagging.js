'use strict';

const _ = require('lodash');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Q = require('q');
const request = require('request');

const config = require('../config');
const ds = require('../services/documents');
const google = require('../services/google-apis');
const helpers = require('../../shared/helpers');

const vision = google.vision;
const translate = google.translate;

const plugins = require('../../plugins');
const motifTagController = plugins.getFirst('motif-tag-controller');
if(!motifTagController) {
  throw new Error('Expected at least one image controller!');
}

const MAX_GOOGLE_SUGGESTIONS = 10;

function getImageBuffer(imageURL) {
  return new Promise((resolve, reject) => {
    request
      .get(imageURL, {
        rejectUnauthorized: false,
        encoding: null
      }, function (error, response, body) {
        if(error) {
          reject(error);
        } else if(response.statusCode === 200) {
          resolve(body);
        } else {
          reject(new Error('Unexpected status code ' + response.statusCode));
        }
      });
  });
}

function googleSuggestions(imageURL) {
  return getImageBuffer(imageURL)
  .then((content) => {
    // construct parameters
    const apiReq = {
      image: {
        content
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

      // Throw any errors
      apiResponse.responses.forEach(response => {
        if(response.error) {
          console.log(imageURL);
          throw new Error(response.error.message);
        }
      });

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
  });
}

/**
 * Fetch the list of suggested tags
 * @param imageUrl string of an absolute public URL to the image
 **/
function fetchSuggestions(imageUrl) {
  return googleSuggestions(imageUrl)
  .then(function(suggestedTags) {
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
          if (!Array.isArray(translations)) {
            translations = [translations];
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
exports.save = function(req, res, next) {
  const collection = req.params.collection;
  const id = req.params.id;
  const metadata = req.body;

  const userTags = helpers.motifTagging.getTags(metadata) || [];
  const visionTags = helpers.motifTagging.getVisionTags(metadata) || [];

  motifTagController.save({
    collection, id, userTags, visionTags
  })
  .then(response => {
    // Update the document in the index
    return motifTagController.updateIndex({
      collection, id, userTags, visionTags
    });
  })
  .then(result => {
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
