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

    app.get('/login',
    function(req, res){
      res.render('login', { env: process.env });
    });

    // Perform session logout and redirect to homepage
    app.get('/logout', function(req, res){
      req.logout();
      res.redirect('/');
    });

    // Perform the final stage of authentication and redirect to '/user'
    app.get('/callback',
      passport.authenticate('auth0', { failureRedirect: '/url-if-something-fails' }),
      function(req, res) {
        res.redirect(req.session.returnTo || '/user');
      });
    }
};
