const expandable = require('./expandable');

const PLAYER_LINK_SELECTOR = '.document__player-link';

(function($) {

  class PlayerController {

    constructor($players, $previewer) {
      this.$players = $players;
      this.$previewer = $previewer;
    }

    initialize() {
      this.initializeSlick();
    }

    initializeSlick() {
      this.$previewerItems = this.$previewer.find('.slick-carousel__items');
      const slideCount = this.$previewerItems.children().length;

      // To address this bug: https://github.com/kenwheeler/slick/issues/1630
      const centerMode = slideCount > 5 ? true : false;

      this.$previewerItems.slick({
        slidesToShow: Math.min(5, slideCount),
        centerMode,
        focusOnSelect: true,
        arrows: false,
        infinite: true,
        asNavFor: this.$players.selector,
        responsive: [{
          breakpoint: 1024,
          settings: {
            slidesToShow: Math.min(3, slideCount)
          }
        }]
      });

      this.$players.slick({
        slidesToShow: 1,
        slidesToScroll: 1,
        arrows: false,
        fade: true,
        adaptiveHeight: true,
        asNavFor: this.$previewerItems.selector
      }).show().on('afterChange', this.updateControls.bind(this));
      // Update the controls right away
      this.updateControls();

      // When the primary image is expanded or collapsed, update Slick
      expandable.bind('has-expanded', () => {
        this.$previewerItems.slick('setPosition');
        this.$players.slick('setPosition');
      });
      expandable.bind('has-collapsed', () => {
        this.$previewerItems.slick('setPosition');
        this.$players.slick('setPosition');
      });
    }

    updateControls() {
      // Determine which player is active
      const $activePlayer = $('.document__players').find('.slick-current');
      // If there is an active player
      if($activePlayer.length) {
        // Read the href - and change location
        const href = $activePlayer.data('href');
        if(href) {
          $(PLAYER_LINK_SELECTOR).removeClass('dimmed').attr('href', href);
        } else {
          $(PLAYER_LINK_SELECTOR).addClass('dimmed').attr('href', null);
        }
      }
    }
  }

  // Initialize motif tagging for every .motif-tagging element on the page
  $(() => {
    const $players = $('.document__players');
    const $previewer = $('.document__player-previewer');
    const controller = new PlayerController($players, $previewer);
    controller.initialize();
  });
})(jQuery);
