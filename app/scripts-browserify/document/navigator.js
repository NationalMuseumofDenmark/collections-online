const Hammer = require('hammerjs');
const helpers = require('../../../shared/helpers');

const PAGE_SIZE = 20;
const HIDING_TIMEOUT = 3000;

const $left = $('a.document__navigator-arrow--left');
const $right = $('a.document__navigator-arrow--right');
const HIDDEN_CLASS = 'document__navigator-arrow--hidden';

const navigatorPreview = require('views/includes/navigator-preview');

const elasticsearch = require('elasticsearch');
const es = new elasticsearch.Client({
  host: location.origin + '/api'
});

const ARROWS = {
  'right': $right,
  'left': $left
};
const DIRECTIONS = {
  2: 'right',
  4: 'left'
};

const navigationQueue = [];
const urls = {};

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
  initializeArrow: (direction, hit) => {
    const $arrow = ARROWS[direction];
    const url = helpers.getDocumentURL(hit.metadata);
    // Save this url such that the swipe listener can change location
    urls[direction] = url;
    $arrow.attr('href', url);
    const $preview = $arrow.find('.document__navigator-preview');
    $preview.html(navigatorPreview({
      helpers,
      metadata: hit.metadata
    }));
    // Showing the arrow
    navigator.showArrow($arrow);
    $(window).on('mousemove', () => {
      navigator.showArrow($arrow);
    }).on('touchstart', () => {
      navigator.showArrow($arrow);
    }).on('touchmove', () => {
      navigator.showArrow($arrow);
    });
  },
  navigate: direction => {
    if(direction in urls) {
      location.href = urls[direction];
    } else {
      navigationQueue.push(direction);
    }
  },
  startHidingArrow: $arrow => {
    let hideTimeout = $arrow.data('hide-timeout');
    if(hideTimeout) {
      clearTimeout(hideTimeout);
    }
    // The arrows hide when the screen is not interacted with
    hideTimeout = setTimeout(() => {
      // Time is up
      $arrow.addClass(HIDDEN_CLASS);
    }, HIDING_TIMEOUT);
    $arrow.data('hide-timeout', hideTimeout);
  },
  showArrow: $arrow => {
    $arrow.removeClass(HIDDEN_CLASS);
    navigator.startHidingArrow($arrow);
  }
};

// Register a listener for the swipe gesture
$('.document').each((i, doc) => {
  const hammer = new Hammer(doc);
  hammer.on('swipe', (e) => {
    if(e.direction in DIRECTIONS) {
      navigator.navigate(DIRECTIONS[e.direction]);
    }
  });
});

// Check if the session storage is available
if(window.sessionStorage) {
  const currentId = $('.document').data('id');
  const {resultsLoaded, queryBody} = navigator.load();

  if(currentId && resultsLoaded && queryBody) {
    let resultsDesired = resultsLoaded.length;

    // Locate the current assets index in the last search result
    const currentIndex = resultsLoaded.findIndex(hit => {
      // The non-typed equal comparison is on purpose
      return currentId == hit.metadata.id;
    });
    const previousIndex = currentIndex - 1;
    const nextIndex = currentIndex + 1;

    if(currentIndex > -1) {
      if(previousIndex >= 0) {
        const previous = resultsLoaded[previousIndex];
        navigator.initializeArrow('left', previous);
      }

      if(nextIndex < resultsLoaded.length) {
        const next = resultsLoaded[nextIndex];
        navigator.initializeArrow('right', next);
      } else {
        // Fetch some more results
        resultsDesired += PAGE_SIZE;
        es.search({
          body: queryBody,
          from: resultsLoaded.length,
          size: resultsDesired - resultsLoaded.length
        }).then((response) => {
          response.hits.hits.forEach((hit) => {
            const item = {
              type: hit._type,
              metadata: hit._source
            };
            resultsLoaded.push(item);
          });
          // Now we might be able to display the next
          if(nextIndex < resultsLoaded.length) {
            navigator.save({
              resultsLoaded, queryBody
            });
            // Now we can initialize
            const next = resultsLoaded[nextIndex];
            navigator.initializeArrow('right', next);
          }
        });
      }
    }
  }
}

module.exports = navigator;
