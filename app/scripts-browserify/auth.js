$(function() {
  var credentials = $('#meta__auth-credentials').data('credentials');

  if(credentials){
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

    $('.btn__login').on('click',function(){
      lock.show();
  });
  }
});
