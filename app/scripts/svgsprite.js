'use strict';
var ajax = new XMLHttpRequest();
ajax.open('GET', '/images/symbol/sprite.svg', true);
ajax.send();
ajax.onload = function() {
  var div = document.createElement('div');
  div.innerHTML = ajax.responseText;
  document.body.insertBefore(div, document.body.childNodes[0]);
  document.getElementsByTagName('div')[0].setAttribute('class', 'sprite');
};
