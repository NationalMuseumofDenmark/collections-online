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
      next();
    });
  },
  registerRoutes: app => {
    app.get('/login', function(req, res) {
      res.render('login', {env: process.env});
    });

    app.get('/logout', function(req, res) {
      req.logout();
      res.redirect('/');
    });

    app.get('/user', function (req, res) {
      res.render('user', {user: req.user});
    });

    app.get('/auth/callback', passport.authenticate('auth0', {
      failureRedirect: '/'
    }), function(req, res) {
      const serializedState = req.query.state;

      if(typeof(serializedState) === 'string') {
        const state = JSON.parse(Buffer.from(serializedState, 'base64'));
        res.redirect(state.returnPath);
      } else {
        res.redirect('/');
      }
    });
  }
};
