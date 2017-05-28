/* global ga */

const SHOW_OVERLAY_SELECTOR = '[data-action="download:show-overlay"]';
const ANIMATION_DURATION = 300;
const OVERLAY_ACTIVE_CLASS = 'overlay__container--active';
const OVERLAY_ANIM_IN_CLASS = 'overlay__container--anim-in';

const downloadOverlayTemplate = require('views/includes/download-overlay');
const Snackbar = require('../snackbar');

// Capture downloads as Google Analytics events

if (ga) {
  $('[data-content="asset-download"] .btn').on('click', e => {
    const size = $(e.target).data('size');
    // TODO: Get the id and catalog from another element
    const id = $('.document').data('id');
    const collection = $('.document').data('collection');
    const catalogIdSize = collection + '-' + id + '-' + size;
    ga('send', 'event', 'asset', 'download', catalogIdSize);
    console.log('send', 'event', 'asset', 'download', catalogIdSize);
  });
}

(function($) {
  class DownloadOverlay {

    reset() {
      // Remove any element that was rendered before this
      if(this.$element) {
        this.$element.remove();
        this.$element = null;
      }
    }

    loadAndShow(collection, id) {
      this.reset();
      $.get('/' + collection + '/' + id + '/json', metadata => {
        this.render(metadata);
        this.show();
      }, 'json').fail(err => {
        Snackbar.error(err.message || 'Der skete en fejl');
      });
    }

    render(metadata) {
      const markup = downloadOverlayTemplate({
        metadata, helpers: window.helpers
      });
      this.$element = $(markup).appendTo('.document');
      // Hide when clicking the overlay
      this.$element.on('click', () => {
        this.hide();
      });
    }

    show() {
      if(this.$element) {
        this.$element.addClass(OVERLAY_ACTIVE_CLASS);
        this.$element.addClass(OVERLAY_ANIM_IN_CLASS);
      }
    }

    hide() {
      if(this.$element) {
        this.$element.removeClass(OVERLAY_ANIM_IN_CLASS);
        setTimeout(() => {
          this.$element.removeClass(OVERLAY_ACTIVE_CLASS);
        }, ANIMATION_DURATION);
      }
    }
  }

  const overlay = new DownloadOverlay();

  $(SHOW_OVERLAY_SELECTOR).on('click', () => {
    // Determine which player is active
    const $activePlayer = $('.document__players').find('.slick-current');
    // If there is an active player
    if($activePlayer.length) {
      // Read the collection and id from the player
      const collection = $activePlayer.data('collection');
      const id = $activePlayer.data('id');
      // Load metadata, render the overlay template and show it
      overlay.loadAndShow(collection, id);
    }
  });
})(jQuery);
