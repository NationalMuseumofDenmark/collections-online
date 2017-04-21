'use strict';

const config = require('collections-online/shared/config');

/* global Auth0Lock */

$(function() {
  const lock = authenticate();
  restrictActions([
    "start-geo-tagging",
    "edit-motif-tags"
  ], lock);

  function authenticate() {
    const lock = new Auth0Lock(config.auth0.clientID, config.auth0.domain, {
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
          scope: 'openid name email picture',
          state: btoa(JSON.stringify({returnPath: window.location.pathname}))
        }
      }
    });

    $('[data-action="login"]').on('click', () => {
      lock.show();
    });

    return lock;
  }

  function restrictActions(actions, lock) {
    const authenticated = $("meta[name='authenticated']").attr("content");

    const dataActions = actions.map(action => {
      return `[data-action="${action}"]`;
    }).join(', ');

    $(dataActions).on('click', (e) => {
      if(authenticated !== 'true') {
        e.stopPropagation();
        lock.show();
      }
    });
  }
});
