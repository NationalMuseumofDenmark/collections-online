'use strict';

const config = require('collections-online/shared/config');

(function($, window) {
  var ACTION_SKOLETUBE_SHOW = '[data-action="skoletube:show-overlay"]';
  var ACTION_ASSET_DOWNLOAD_SHOW = '[data-action="download:show-overlay"]';
  var CONTENT_ASSET_DOWNLOAD = '[data-content="asset-download"]';
  var CONTENT_SLIDER = '.slider';
  var OVERLAY_ACTIVE_CLASS = 'overlay__container--active';
  var OVERLAY_ANIM_IN_CLASS = 'overlay__container--anim-in';

  var AssetPage = {
    init: function() {
      $(ACTION_ASSET_DOWNLOAD_SHOW)
        .on('click', this.actionAssetDownloadShow.bind(this, true));
      // Skoletube overlay piggybacks on the download overlay as they have the
      // same behaviour when isDownloadable is false and that is the only state
      // where the skoletube icon will have the ACTION_SKOLETUBE_SHOW attribute.
      $(ACTION_SKOLETUBE_SHOW)
        .on('click', this.actionAssetDownloadShow.bind(this, true));
      $(CONTENT_ASSET_DOWNLOAD)
        .on('click', this.actionAssetDownloadShow.bind(this, false));

      if ($(CONTENT_SLIDER).size() > 0) {
        $(CONTENT_SLIDER).slick({
          lazyLoad: 'progressive',
          infinite: true,
          speed: 300,
          slidesToShow: 6,
          slidesToScroll: 6,
          prevArrow: '.related-assets__prev-arrow',
          nextArrow: '.related-assets__next-arrow',

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
    },

    actionAssetDownloadShow: function(show) {
      var $el = $(CONTENT_ASSET_DOWNLOAD);
      if (show === true) {
        $el.addClass(OVERLAY_ACTIVE_CLASS);
        $el.addClass(OVERLAY_ANIM_IN_CLASS);
      } else if (show === false) {
        $el.removeClass(OVERLAY_ANIM_IN_CLASS);
        setTimeout(function() {
          $el.removeClass(OVERLAY_ACTIVE_CLASS);
        }, 300);
      }
    }
  };

  window.AssetPage = AssetPage;
})(jQuery, window);
