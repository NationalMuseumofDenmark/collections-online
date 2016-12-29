'use strict';

/* global $ */

const Snackbar = {
  init: function() {
    var $container = $('<div class="snackbar-container" />');
    var $snack = $('<div class="snackbar">' +
                     '<div class="snackbar__content" />' +
                   '</div>');
    $container.append($snack);
    $('body').append($container);
    this.$snack = $snack;
    this.$content = $snack.children('.snackbar__content');
    this.$container = $container;
    this.showing = false;
    this.snackQueue = [];
  },

  // Show an info box (no interaction)
  info: function(message) {
    this.snackQueue.push({
      type: 'info',
      duration: 5000,
      message: message
    });
    this._showSnack();
  },

  // Show an error box (no interaction)
  error: function(message) {
    this.snackQueue.push({
      type: 'error',
      duration: 5000,
      message: message
    });
    this._showSnack();
  },

  clear: function() {
    // Clear the queue
    this.snackQueue = [];
    // And hide the snack (if any)
    this._hideSnack();
  },

  _showSnack: function() {
    // Prevent showing a new snack before the previous is done animating
    if (this.showing === true || this.snackQueue.length === 0) { return; }

    var obj = this.snackQueue.shift();
    this.$container.addClass('snackbar-container--active');
    this.$content.text(obj.message);
    this.showing = true;

    this.snackQueueTimeout = setTimeout(
      this._checkQueue.bind(this, 'showing'), 600);

    this.snackTimeout = setTimeout(this._hideSnack.bind(this), obj.duration);
  },

  _checkQueue: function(action) {
    if (action === 'hiding') {
      this.showing = false;
      if (this.snackQueue.length > 0) {
        this._showSnack();
      }
    } else if (action === 'showing') {
      if (this.snackQueue.length > 0) {
        this._hideSnack();
      }
    }
  },

  _hideSnack: function() {
    clearTimeout(this.snackTimeout);
    this.$container.removeClass('snackbar-container--active');
    this.snackQueueTimeout = setTimeout(
      this._checkQueue.bind(this, 'hiding'), 600);
  }
};

$(() => {
  // Initalize when the document is ready
  Snackbar.init();
});

module.exports = Snackbar;
