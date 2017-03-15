$(function() {
  var credentials = $("meta[name='auth-credentials']").attr('content');

  if(credentials){
    credentials = JSON.parse(credentials);

    var lock = new Auth0Lock(credentials.clientId, credentials.domain, {
      languageDictionary: {
        title: "kbhbilleder.dk"
      },
      theme: {
        logo: '/images/favicons/favicon-96x96.png',
        labeledSubmitButton: false,
        primaryColor: 'hsl(340, 88%, 47%)'
      },
      language: 'da',
      auth: {
        redirectUrl: credentials.callbackUrl,
        responseType: 'code',
        params: {
          scope: 'openid name email picture'
        }
      }
    });

    $('[data-action="login"]').on('click',function(){
      lock.show();
    });
  }
});
