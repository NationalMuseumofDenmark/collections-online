// Register click listener that acts on the 'toggle-expandable' action
const DOCUMENT_SELECTOR = '.document';
const TOGGLE_EXPANSION_SELECTOR = '[data-action="toggle-expandable"]';
const EXPANDABLE_SELECTOR = '.document__expandable';
const EXPANDED_CLASS = 'document__expandable--expanded';

const ANIMATION_DURATION = 150; // Should match the delay used in document.scss

const expandable = {
  toggle: () => {
    // For everything expandable, toggle the class
    $(EXPANDABLE_SELECTOR).toggleClass(EXPANDED_CLASS).each((i, expandable) => {
      const expanded = $(expandable).hasClass(EXPANDED_CLASS);
      if(expanded) {
        $(EXPANDABLE_SELECTOR).trigger('expanded');
      } else {
        $(EXPANDABLE_SELECTOR).trigger('collapsed');
      }
    });
  },
  expand: () => {
    const $expandable = $(EXPANDABLE_SELECTOR);
    $expandable.removeClass(EXPANDED_CLASS);
    $expandable.trigger('expanded');
  },
  collapse: () => {
    const $expandable = $(EXPANDABLE_SELECTOR);
    $expandable.removeClass(EXPANDED_CLASS);
    $expandable.trigger('collapsed');
  },
  bind: (on, callback) => {
    $(EXPANDABLE_SELECTOR).bind(on, callback);
  },
  unbind: (on, callback) => {
    $(EXPANDABLE_SELECTOR).unbind(on, callback);
  }
};

$(DOCUMENT_SELECTOR).on('click', TOGGLE_EXPANSION_SELECTOR, () => {
  expandable.toggle();
});

// Trigger a faked window resize on expand and collapse
// This helps elements inside the expandable realize they've changed size
const fakedWindowResize = () => {
  const resizeEvent = new Event('resize');
  window.dispatchEvent(resizeEvent);
};
expandable.bind('has-expanded', fakedWindowResize);
expandable.bind('has-collapsed', fakedWindowResize);

function triggerDelayed($element, what) {
  let triggerTimeout = $element.data('trigger-timeout');
  clearTimeout(triggerTimeout);
  triggerTimeout = setTimeout(() => {
    $element.trigger(what);
  }, ANIMATION_DURATION);
  $element.data('trigger-timeout', triggerTimeout);
}

// Trigger the has-* events after the expanded and collapsed events has fired,
// delayed by the duration of the animation.
expandable.bind('expanded', (e) => {
  const $element = $(e.target);
  triggerDelayed($element, 'has-expanded');
});
expandable.bind('collapsed', (e) => {
  const $element = $(e.target);
  triggerDelayed($element, 'has-collapsed');
});

module.exports = expandable;
