'use strict';

(function($, window) {
  var ACTION_ASSET_DOWNLOAD_SHOW = '[data-action="asset-download-show"]';
  var CONTENT_ASSET_DOWNLOAD = '[data-content="asset-download"]';
  var OVERLAY_ACTIVE_CLASS = 'overlay__container--active';
  var OVERLAY_ANIM_IN_CLASS = 'overlay__container--anim-in';

  var ACTION_FULLSCREEN_SHOW = '[data-action="fullscreen-show"]';
  var CONTENT_FULLSCREEN_WRAP = '.fullscreen-wrap';
  var ASSET_IMAGE_CONTAINER = '.asset-top';


  var AssetPage = {
    init: function() {
      $(ACTION_ASSET_DOWNLOAD_SHOW)
        .on('click', this.actionAssetDownloadShow.bind(this, true));
      $(CONTENT_ASSET_DOWNLOAD)
        .on('click', this.actionAssetDownloadShow.bind(this, false));
      $(ACTION_FULLSCREEN_SHOW)
        .on('click', this.openFullscreen.bind(this));
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
    },

    openFullscreen: function() {
      $(CONTENT_FULLSCREEN_WRAP).fullscreen(true);
      $(ASSET_IMAGE_CONTAINER).addClass('big-screen');
    }
  };


  window.AssetPage = AssetPage;

})(jQuery, window);
