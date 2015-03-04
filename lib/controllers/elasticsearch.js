var request = require('request');
var config = require('../config/config');

function reqIsAllowed(req) {
	if(req.method === 'GET' || req.method === 'POST') {
		if(req.path.indexOf(config.es_assets_index +'/_search') === 0) {
			return true;
		}
	}
	// Assume that all but the above exceptions are not allowed.
	return false;
}

exports.proxy = function(req, res, next) {
	// Remove the /es/ from the requested URL.
	var path = req.url.substring(4);
	// Create an object for the proxy request.
	var proxyReq = {
		method: req.method,
		path: path
	};
	// Check if the proxy request is allowed.
	if(reqIsAllowed(proxyReq)) {
		// Prepending the actual protocol-scheme and hostname.
		proxyReq.url = 'http://' + config.es_host + '/' + proxyReq.path;
		// Reset the unused field.
		proxyReq.path = undefined;
		// Request and pipe it through.
		request(proxyReq).pipe(res);
	} else {
		next(new Error('The request is not allowed - please contact us if you ' +
			'would like the ability to issue such requests.'));
	}
};