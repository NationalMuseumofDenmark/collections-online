var passport = require('passport');
var auth0 = require('../lib/services/auth0');

module.exports = {
  type: 'authentication',
  module: auth0,
  initialize: (app) => {
    passport.use(auth0.strategy);

    passport.serializeUser(function(user, done) {
      done(null, user);
    });

    passport.deserializeUser(function(user, done) {
      done(null, user);
    });

    app.use(passport.initialize());
    app.use(passport.session());

    app.use(function(req, res, next) {
      res.locals.user = req.user;
      res.locals.authCredentials = {
        clientId: process.env.AUTH0_CLIENT_ID,
        callbackUrl: process.env.AUTH0_CALLBACK_URL,
        domain: process.env.AUTH0_DOMAIN
      }
      next();
    });

    mountRoutes(app);
  }
}

function mountRoutes(app){
  app.get('/login', function(req, res) {
    res.render('login', { env: process.env });
  });

  app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
  });

  app.get('/user', function (req, res) {
    res.render('user', { user: req.user });
  });

  app.get('/auth/callback', passport.authenticate('auth0',
    { failureRedirect: '/url-if-something-fails' }),
    function(req, res) {
      res.redirect(req.session.returnTo || '/');
    }
  );
}
