// Register click listener that acts on the 'toggle-expandable' action
const DOCUMENT_TOP_SELECTOR = '.document__top';
const TOGGLE_EXPANSION_SELECTOR = '[data-action="toggle-expandable"]';
const EXPANDABLE_SELECTOR = '.document__expandable';
const EXPANDED_CLASS = 'document__expandable--expanded';

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
    $(EXPANDABLE_SELECTOR).addClass(EXPANDED_CLASS);
    $(EXPANDABLE_SELECTOR).trigger('expanded');
  },
  collapse: () => {
    $(EXPANDABLE_SELECTOR).removeClass(EXPANDED_CLASS);
    $(EXPANDABLE_SELECTOR).trigger('collapsed');
  },
  bind: (on, callback) => {
    $(EXPANDABLE_SELECTOR).bind(on, callback);
  },
  unbind: (on, callback) => {
    $(EXPANDABLE_SELECTOR).unbind(on, callback);
  }
};

$(DOCUMENT_TOP_SELECTOR).on('click', TOGGLE_EXPANSION_SELECTOR, () => {
  expandable.toggle();
});

// Trigger a faked window resize on expand and collapse
// This helps elements inside the expandable realize they've changed size
const fakedWindowResize = () => {
  setTimeout(() => {
    const resizeEvent = new Event('resize');
    window.dispatchEvent(resizeEvent);
  }, 150); // Should match the delay used in document.scss
};
expandable.bind('expanded', fakedWindowResize);
expandable.bind('collapsed', fakedWindowResize);

module.exports = expandable;
