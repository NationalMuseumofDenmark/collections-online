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
      translate.translate(tags, 'en', 'da', function(err, translations) {
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
            return translation.translatedText.toLowerCase();
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

function updateIndex(metadata) {
  var indexingState = {
    es: es,
    index: config.es.assetsIndex
  };
  var transformations = [
    require('collections-online-cumulus/indexing/transformations/tag-hierarchy')
  ];
  return indexAsset(indexingState, metadata, transformations);
}

function saveToCip(catalog, id, values) {
  return cip.setFieldValues(catalog, id, 'web', values)
  .then(function(response) {
    if (response.statusCode !== 200) {
      throw new Error('Failed to set the field values');
    }
  });
}

exports.saveCrowdTag = function(req, res, next) {
  var collection = req.params.collection;
  var id = req.params.id;
  var tag = req.body.tag;

  es.get({
    index: config.es.assetsIndex,
    type: 'asset',
    id: collection + '-' + id
  }).then(function(response) {
    var metadata = response._source;
    var existingTags = _.union(metadata.tags, metadata.tags_crowd);
    // Let's not allow for the same tag to be added twice
    if (existingTags.indexOf(tag) !== -1) {
      throw new Error('Emneordet "' + tag + '" eksisterer allerede');
    } else {
      if (!metadata.tags_crowd) {
        metadata.tags_crowd = [];
      }
      metadata.tags_crowd.push(tag);
    }
    return metadata;
  })
  .then(function(metadata) {
    var values = {};
    values[CROWD_TAGS] = metadata.tags_crowd.join(',');
    return saveToCip(collection, id, values).then(function() {
      return metadata;
    });
  })
  .then(function(metadata) {
    updateIndex(metadata);
  })
  .then(function() {
    res.json({
      success: true
    });
  }, next);

  //TODO Implement remove crowd tag
};

exports.typeaheadSuggestions = function(req, res, next) {
  var text = req.query.text.toLowerCase();
  console.log('Searching for suggestions starting with', text);
  es.search({
    'index': config.es.assetsIndex,
    'body': {
      'size': 0,
      'aggs': {
        'searchable': {
          'filter': {
            'term': {
              'is_searchable': true
            }
          },
          'aggs': {
            'tags': {
              'terms': {
                'field': 'tags',
                'include': text + '.*'
              }
            },
            'tagsCrowd': {
              'terms': {
                'field': 'tags_crowd',
                'include': text + '.*'
              }
            },
            'tagsVision': {
              'terms': {
                'field': 'tags_vision',
                'include': text + '.*'
              }
            }
          }
        }
      }
    }
  }).then(function(response) {
    var tags = response.aggregations.searchable.tags.buckets;
    var tagsCrowd = response.aggregations.searchable.tagsCrowd.buckets;
    var tagsVision = response.aggregations.searchable.tagsVision.buckets;

    // Concat the three list of tags and sort them
    var allTags = _.concat(tags, tagsCrowd, tagsVision)
    .sort(function(tagA, tagB) {
      return tagB.doc_count - tagA.doc_count;
    }).map(function(tag) {
      return tag.key;
    });

    // Iron out duplicates
    allTags = _.uniq(allTags);
    res.json(allTags);
  }, next);
};
