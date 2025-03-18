const express = require('express');
const router = express.Router();
const passport = require('passport');
const session = require('express-session');
const bcrypt = require('bcrypt');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { db } = require('../firebase/config');

var isLoggedIn=false;

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    const userRef = db.collection('users').doc(profile.id);
    const userDoc = await userRef.get();
  
    if (!userDoc.exists) {
      await userRef.set({
        email: profile.emails[0].value,
        name: profile.displayName,
        provider: 'google'
      });
    }
  
    done(null, { id: profile.id, email: profile.emails[0].value });
  }));
  
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id, done) => {
    const userRef = db.collection('users').doc(id);
    const userDoc = await userRef.get();
    done(null, userDoc.data());
});

// SIGNUP
router.post('/signup', async (req, res) => {
    const { email, password } = req.body;
  
    try {
      const usersRef = db.collection('users');
      const snapshot = await usersRef.where('email', '==', email).get();
  
      if (!snapshot.empty) {
        return res.send('User already exists');
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
      await usersRef.add({
        email,
        password: hashedPassword,
        provider: 'local'
      });
  
      res.redirect('/');
    } catch (err) {
      console.error(err);
      res.send('Error creating user');
    }
});

//LOGIN 
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();

    if (snapshot.empty) {
      return res.send('No user found');
    }

    const userDoc = snapshot.docs[0];
    const user = userDoc.data();

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.send('Invalid password');
    }

    // Set session manually
    req.session.user = { email: user.email, id: userDoc.id };
    res.redirect('/');
    isLoggedIn=true;
  } catch (err) {
    console.error(err);
    res.send('Error logging in');
  }
});

// LOGOUT 
router.get('/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy();
    res.redirect('/');
  });
});

//GOOGLE AUTH ROUTES 
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Set session manually
    req.session.user = { id: req.user.id, email: req.user.email };
    res.redirect('/');
  }
);

module.exports = router;

