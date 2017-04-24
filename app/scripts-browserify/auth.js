'use strict';

const config = require('collections-online/shared/config');

/* global Auth0Lock */

$(function() {
  restrictActions([
    "login",
    "start-geo-tagging",
    "edit-motif-tags"
  ], lock());

  function lock() {
    return new Auth0Lock(config.auth0.clientID, config.auth0.domain, {
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
  }

  function restrictActions(actions, lock) {
    const authenticated = $("meta[name='authenticated']").attr("content");

    const dataActions = actions.map(action => {
      return `[data-action="${action}"]`;
    }).join(', ');

    $(dataActions).on('click', (e) => {
      if(authenticated !== 'true') {
        e.stopPropagation();
        lock.show({
          auth: {
            params: {
              state: btoa(JSON.stringify({returnPath: window.location.href}))
            }
          }
        });
      }
    });
  }
});
