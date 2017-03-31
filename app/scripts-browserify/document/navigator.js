const helpers = require('../../../shared/helpers');

// Check if the session storage is available
if(window.sessionStorage) {
  const currentId = $('.document').data('id');
  const resultsString = window.sessionStorage.getItem('searchResultsLoaded');

  if(currentId && resultsString) {
    const results = JSON.parse(resultsString);

    console.log('results', results);

    // Locate the current assets index in the last search result
    const currentIndex = results.findIndex((hit) => {
      // The non-typed equal comparison is on purpose
      return currentId == hit.metadata.id;
    });

    if(currentIndex > -1) {
      let previousHit = null;
      if(currentIndex > 0) {
        previousHit = results[currentIndex-1];
      }

      let nextHit = null;
      if(currentIndex < results.length) {
        nextHit = results[currentIndex+1];
      }

      if(previousHit) {
        const previousURL = helpers.getDocumentURL(previousHit.metadata);
        console.log('Previous asset: ', previousURL);
      }

      if(nextHit) {
        const nextURL = helpers.getDocumentURL(nextHit.metadata);
        console.log('Next asset: ', nextURL);
      }
    }
  }
}
