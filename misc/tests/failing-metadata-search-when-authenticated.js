'use strict';
var request = require('request');

// The base url of the Cumulus CIP installation.
var CIP_BASEURL = process.env.CIP_BASEURL || 'http://cumulus.natmus.dk/CIP/';

// Some IDs on actual assets within the catalog.
var IDs;
if (process.env.IDS) {
  // Read these off an IDS environment variable, integers seperated by commas.
  IDs = process.env.IDS.split(',');
} else {
  // Default value: Matching the National Museeum's setup.
  IDs = [14669, 75497, 142085, 141234, 81928, 81928, 142085];
}

// The catalog in which to perform the test.
var CATALOG_ALIAS = process.env.CATALOG_ALIAS || 'DMR';
// The view from which the available values are setup.
var VIEW = process.env.VIEW || 'web';
// Credentials for the authenticated session.
var USER = process.env.CIP_USERNAME;
var PASSWORD = process.env.CIP_PASSWORD;

// Deriving URLs - no need to change these.
var SESSION_OPEN_URL = CIP_BASEURL + 'session/open';
var METADATA_SEARCH_URL = CIP_BASEURL + 'metadata/search/' + CATALOG_ALIAS;
var METADATA_SEARCH_VIEW_URL = METADATA_SEARCH_URL + '/' + VIEW;

// The test is going through an array of asset IDs. Performing metadata/search
// calls with querystring "ID is N" where N is the id of each of the assets.
function performTest(url, ids) {
  ids.forEach(function(id) {
    var namedParameters = {'querystring': 'ID is \"' + id + '\"'};
    return request.post({
      url: url,
      form: namedParameters
    }, function(isError, response, body) {
      var bodyParsed = JSON.parse(body);
      var assets = bodyParsed.items;
      assets.forEach(function(asset) {
        if (asset.id !== id) {
          console.log('Test failed! Got ' + asset.id +
                      ' when requesting ' + id);
        }
      });
    });
  });
}

console.log('Requesting without a jsessionid: Test passing.');
performTest(METADATA_SEARCH_VIEW_URL, IDs);

request.post({url: SESSION_OPEN_URL}, function(isError, response, body) {
  console.log('Requesting with a non-authenticated jsessionid: Test passing.');
  var jsessionid = JSON.parse(body).jsessionid;
  performTest(METADATA_SEARCH_VIEW_URL + ';jsessionid=' + jsessionid, IDs);
});

request.post({
  url: SESSION_OPEN_URL,
  form: {
    user: USER,
    password: PASSWORD
  }
}, function(isError, response, body) {
  console.log('Requesting with an authenticated jsessionid: Test failing.');
  var jsessionid = JSON.parse(body).jsessionid;
  performTest(METADATA_SEARCH_VIEW_URL + ';jsessionid=' + jsessionid, IDs);
});
