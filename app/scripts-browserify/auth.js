$(function() {
  var credentials = $('#meta__auth-credentials').data('credentials');

  if(credentials){
    var lock = new Auth0Lock(credentials.clientId, credentials.domain, {
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
