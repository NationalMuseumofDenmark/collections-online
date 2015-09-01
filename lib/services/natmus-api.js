var request = require('request');
var keepAliveAgent = require('agentkeepalive');
var Q = require('q');

function NatmusAPIError(message) {
    this.name = "NatmusAPIError";
    this.message = (message || "");
}
NatmusAPIError.prototype = Error.prototype;

function NatmusAPIClient() {

}

NatmusAPIClient.prototype.config = function(settings) {
  // Removes any trailing slashes.
  this.baseURL = settings.baseURL.replace(/\/$/, '');
  this.version = parseInt(settings.version, 10);
  this.agent = new keepAliveAgent({
    maxSockets: settings.maxSockets
  });
};

NatmusAPIClient.prototype.request = function(path, method, data) {
  var deferred = Q.defer();

  if(typeof(path) === 'object') {
    path = path.join('/');
  }
  if(!method) {
    method = 'GET';
  }

  var requestOptions = {
    url: [this.baseURL, 'v'+this.version, path].join('/'),
    method: method,
    json: true,
    agent: this.agent
  };

  if(method === 'GET') {
    requestOptions.qs = data;
  } else {
    throw new NatmusAPIError('Using a '+method+' method is not implemented.');
  }

  console.log(requestOptions);

  request(requestOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      deferred.resolve(body);
    } else if (!error && response.statusCode !== 200) {
      var message = body.Message || 'No message from the API';
      message += ' (status '+response.statusCode+')';
      deferred.reject( new NatmusAPIError(message) );
    } else {
      deferred.reject(error);
    }
  });

  return deferred.promise;
};

NatmusAPIClient.prototype.getObject = function(collection, id) {
  // Let's format the arguments.
  id = parseInt(id, 10);
  collection = collection.replace('"', '');
  // Shoot off the request.
  return this.request('Search', 'GET', {
    query: '(id:'+id+' AND collection:"'+collection+'" AND type:"Object")'
  }).then(function(result) {
    if(result.NumberOfResultsTotal === 1) {
      if(result.Results.length === 1) {
        return result.Results[0];
      } else {
        throw new NatmusAPIError('Malformed response from service');
      }
    } else if(result.NumberOfResultsTotal >= 1) {
      throw new NatmusAPIError('Service returned more than a single object.');
    } else {
      throw new NatmusAPIError('No object found');
    }
  });
};

module.exports = new NatmusAPIClient();
