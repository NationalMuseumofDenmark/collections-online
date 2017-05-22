
(function($) {

  class PlayerController {

    constructor($players, $previewer) {
      this.$players = $players;
      this.$previewer = $previewer;
      this.state = {
      };
    }

    initialize() {
      this.initializeSlick();
    }

    initializeSlick() {
      const $previewerItems = this.$previewer.find('.slick-carousel__items');

      this.$players.slick({
        slidesToShow: 1,
        slidesToScroll: 1,
        arrows: false,
        fade: true,
        adaptiveHeight: true,
        asNavFor: $previewerItems.selector
      });

      $previewerItems.slick({
        slidesToShow: 3,
        slidesToScroll: 1,
        centerMode: true,
        focusOnSelect: true,
        arrows: false,
        asNavFor: this.$players.selector
      });
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
