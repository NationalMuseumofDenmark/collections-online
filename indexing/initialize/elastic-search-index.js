'use strict';

/**
 * This initializes the ElasticSearch index.
 * @param {Object} state The state of which we are about to initialize.
 */

function elasticSearchIndex(state) {
	console.log('Initializing the Elastic Search index');

	return state.es.indices.create({
		index: process.env.ES_INDEX || 'assets'
	}).then(function() {
		console.log('Index created.');
		return state;
	}, function(err) {
		// TODO: Add a recursive check for this message.
		if(err.message === 'No Living connections') {
			throw new Error( 'Is the Elasticsearch server running?' );
		} else if(err.message === 'IndexAlreadyExistsException[[assets] already exists]') {
			console.log('Index was already created.');
			return state;
		}
		console.log('Failed to initialize the ElasticSearch index:', err);
	});
}

module.exports = elasticSearchIndex;