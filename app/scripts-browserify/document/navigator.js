const helpers = require('../../../shared/helpers');

const $navigator = $('.document__navigator');
const $left = $navigator.find('a.document__navigator-left');
const $right = $navigator.find('a.document__navigator-right');
const $leftTitle = $left.find('.document__navigator-title');
const $rightTitle = $right.find('.document__navigator-title');
const navigator = {
  save: (state) => {
    if(window.sessionStorage) {
      const searchString = JSON.stringify(state);
      window.sessionStorage.setItem('search', searchString);
    } else {
      console.warn('Cannot save search state: sessionStorage is not supported');
    }
  },
  load: () => {
    const searchString = window.sessionStorage.getItem('search');
    return searchString ? JSON.parse(searchString) : {};
  },
};

// Check if the session storage is available
if(window.sessionStorage) {
  const currentId = $('.document').data('id');
  const resultsString = window.sessionStorage.getItem('searchResultsLoaded');

  if(currentId && resultsString) {
    const results = JSON.parse(resultsString);

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
        const previousTitle = helpers.documentTitle(previousHit.metadata);
        $left.attr('href', previousURL);
        $leftTitle.text(previousTitle);
      }

      if(nextHit) {
        const nextURL = helpers.getDocumentURL(nextHit.metadata);
        const nextTitle = helpers.documentTitle(nextHit.metadata);
        $right.attr('href', nextURL);
        $rightTitle.text(nextTitle);
      }

      $navigator.removeClass('hidden');
    }
  }
}

module.exports = navigator;
