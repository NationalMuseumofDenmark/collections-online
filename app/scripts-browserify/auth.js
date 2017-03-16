'use strict';

const config = require('collections-online/shared/config');

/* global Auth0Lock */

$(function() {
  var lock = new Auth0Lock(config.auth0.clientID, config.auth0.domain, {
    languageDictionary: {
      title: config.siteTitle
    },
    theme: {
      logo: '/images/favicons/favicon-96x96.png',
      labeledSubmitButton: false,
      primaryColor: config.themeColor
    },
    language: 'da',
    auth: {
      redirectUrl: config.auth0.callbackURL,
      responseType: 'code',
      params: {
        scope: 'openid name email picture'
      }
    }
  });

  $('[data-action="login"]').on('click',function(){
    lock.show();
  });
});
