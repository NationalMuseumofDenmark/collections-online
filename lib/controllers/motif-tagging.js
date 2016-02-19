'use strict';

var google = require('../services/google-apis'),
    vision = google.vision,
    translate = google.translate,
    _ = require('lodash'),
    Q = require('q');

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

exports.suggestions = function(req, res, next) {
  var catalog_alias = req.params.catalog;
  var id = req.params.id;
  var host = req.headers["x-forwarded-host"] || req.get('host');
  var imageURL = 'http://' + host + '/' + catalog_alias + '/' + id + '/thumbnail';

  var suggestionsPromises = [
    googleSuggestions(imageURL)
  ];

  Q.all(suggestionsPromises).then(function(suggestedTags) {
    var tags = _.union.apply(null, suggestedTags);

    translate.translate(tags, 'en', 'da', function(err, translations) {
      if(err) {
        next(err);
      } else {
        translations = translations.map(function(translation) {
          return translation.translatedText.toLowerCase();
        });
        res.send(JSON.stringify({ tags:translations }));
      }
    });
  }, next);
};
