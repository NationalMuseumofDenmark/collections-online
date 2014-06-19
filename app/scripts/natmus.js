'use strict';

var container = document.querySelector('#masonry-container');
var msnry;
// Initialize Masonry after all images have loaded
imagesLoaded(container, function() {
  msnry = new Masonry(container);
});