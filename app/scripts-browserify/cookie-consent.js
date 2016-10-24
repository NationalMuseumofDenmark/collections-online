require('cookieconsent/build/cookieconsent.min.js');

// We're using http://cookieconsent.wpengine.com/documentation/javascript-api/

window.cookieconsent.initialise({
  cookie: {
    name: config.features.cookieName
  },
  content: {
    message: 'Vi bruger cookies for at give dig en bedre brugeroplevelse.',
    ok: 'OK',
    link: 'Læs mere',
    href: '/cookies',
  },
  elements: {
    dismiss: '<a aria-label="Ok til cookies" tabindex="0" class="cc-btn cc-dismiss">{{ok}}</a>',
    messagelink: '<span>{{message}} <a href="{{href}}">{{link}}</a></span>',
  }
});
