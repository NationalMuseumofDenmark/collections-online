'use strict';

const google = require('../services/google-apis');
const vision = google.vision;
const translate = google.translate;

exports.all = function(req, res, next){
  var catalog_alias = req.params.catalog;
  var id = req.params.id;
  var host = req.headers["x-forwarded-host"] || req.get('host');
  var imageUrl = 'http://' + host + '/' + catalog_alias + '/' + id + '/thumbnail';

  // construct parameters
  const apiReq = new vision.Request({
    image: new vision.Image({ url: imageUrl }),
    features: [
      new vision.Feature('LABEL_DETECTION', 10)
    ]
  });

  // Get labels
  vision.annotate(apiReq).then(function(apiRes) {
    var tags = apiRes.responses[0].labelAnnotations.map(function(label) {
      return label.description;
    });

    translate.translate(tags, 'en', 'da', function(err, translations) {
      if(err) return res.send(err);

      translations = translations.map(function(translation) {
        return translation.translatedText;
      });
      res.send(JSON.stringify({ tags:translations }));
    });
  }, function(e) {
    res.send(e);
  });

};
