require('cookieconsent/build/cookieconsent.min.js');

// We're using http://cookieconsent.wpengine.com/documentation/javascript-api/

window.cookieconsent.initialise({
  cookie: {
    name: config.features.cookieName
  },
  content: {
    header: 'Cookies used on the website!',
    message: 'Vi bruger cookies for at give dig en bedre brugeroplevelse.',
    dismiss: 'OK',
    link: 'Læs mere',
    href: '/cookies',
  }
});
