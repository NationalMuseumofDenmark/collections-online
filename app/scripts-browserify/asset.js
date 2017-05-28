'use strict';

const config = require('collections-online/shared/config');

(function($, window) {
  var RELATED_ASSETS_SLIDER = '.related-assets > .slick-carousel__items';
  var OVERLAY_ACTIVE_CLASS = 'overlay__container--active';
  var OVERLAY_ANIM_IN_CLASS = 'overlay__container--anim-in';

  var AssetPage = {
    init: function() {
      if ($(RELATED_ASSETS_SLIDER).size() > 0) {
        $(RELATED_ASSETS_SLIDER).slick({
          lazyLoad: 'progressive',
          infinite: true,
          speed: 300,
          slidesToShow: 6,
          slidesToScroll: 6,
          prevArrow: '.related-assets .slick-carousel__prev-arrow',
          nextArrow: '.related-assets .slick-carousel__next-arrow',

          responsive: [{
            breakpoint: 1180,
            settings: {
              arrows: false
            }
          }, {
            breakpoint: 768,
            settings: {
              slidesToShow: 4,
              slidesToScroll: 4,
              arrows: false
            }
          }, {
            breakpoint: 480,
            settings: {
              slidesToShow: 3,
              slidesToScroll: 3,
              arrows: false
            }
          }]
        });
      }
    }
  };

  window.AssetPage = AssetPage;
})(jQuery, window);
