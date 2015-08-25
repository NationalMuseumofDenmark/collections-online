var natmusApi = require('../services/natmus-api');

function generateTitle(objectMetadata) {
  var result = [];
  if(objectMetadata.material) {
    result.push(objectMetadata.material);
  }
  if(objectMetadata.workDescription) {
    result.push(objectMetadata.workDescription);
  }
  if(objectMetadata.findPlace) {
    result.push('fra ' + objectMetadata.findPlace);
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

exports.index = function(req, res, next) {
    var collection = req.params.collection;
    var id = req.params.id;

    natmusApi.getObject(collection, id)
    .then(function(objectMetadata) {
      // The object was not found if it's not publically available.
      if(!objectMetadata.publicAvailable) {
        throw new Error('No object found');
      }

      var renderParamenters = {
        object: {
          title: generateTitle(objectMetadata),
          collection: objectMetadata.collection,
          metadata: []
        },
        req: req
      };

      for(var fieldName in objectMetadata) {
        renderParamenters.object.metadata.push({
          name: fieldName,
          value: objectMetadata[fieldName]
        });
      }

      return renderParamenters;
    })
    .then(function(renderParamenters) {
      res.render('object.jade', renderParamenters);
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