const express = require('express');
const router = express.Router();
const { db } = require('../firebase/config');
const axios = require('axios');


function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect('/login');
}

router.get('/dashboard', isAuthenticated, async (req, res) => {
  const userId = req.session.user.id;
  const watchlistRef = db.collection('watchlists').doc(userId).collection('movies');
  const snapshot = await watchlistRef.get();

  const watchlist = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  res.render('dashboard', { watchlist });
});

// GET: Search Page
router.get('/search', async (req, res) => {
  const title = req.query.title;
  const apiKey = process.env.MY_API_KEY;

  // List of keywords to pick from randomly
  const randomKeywords = ['marvel', 'batman', 'spider', 'avengers', 'harry', 'star', 'fast', 'matrix'];
  const fallbackQuery = randomKeywords[Math.floor(Math.random() * randomKeywords.length)];

  try {
    const searchTerm = title || fallbackQuery;

    const response = await axios.get(`http://www.omdbapi.com/?s=${encodeURIComponent(searchTerm)}&apikey=${apiKey}`);
    const movies = response.data.Search || [];

    res.render('search', { title: 'Search Movies', movies });
  } catch (error) {
    console.error('Error fetching movies:', error.message);
    res.render('search', { title: 'Search Movies', movies: [] });
  }
});



// ADD TO WATCHLIST
router.post('/add-to-watchlist', isAuthenticated, async (req, res) => {
  const { imdbID, title, year, poster } = req.body;
  const userId = (req.session.user && req.session.user.id) || (req.user && req.user.id);

  try {
    const watchlistRef = db.collection('watchlists').doc(userId).collection('movies');
    const movieDoc = await watchlistRef.doc(imdbID).get();

    if (movieDoc.exists) {
      return res.send('Movie already in watchlist!');
    }

    await watchlistRef.doc(imdbID).set({
      imdbID,
      title,
      year,
      poster
    });

    res.redirect('/dashboard');
  } catch (err) {
    console.error('Error adding to watchlist:', err);
    res.send('Failed to add movie to watchlist.');
  }
});

// REMOVE FROM WATCHLIST

router.post('/remove', isAuthenticated, async (req, res) => {
  const userId = req.session.user.id;
  const imdbID = req.body.imdbID;

  try {
    const watchlistRef = db.collection('watchlists').doc(userId).collection('movies');
    
    console.log('Attempting to remove:', imdbID);

    const snapshot = await watchlistRef.where('imdbID', '==', imdbID).get();

    if (snapshot.empty) {
      console.log('Movie not found in watchlist.');
      return res.redirect('/dashboard');
    }

    snapshot.forEach(doc => {
      console.log('Deleting doc with ID:', doc.id);
      doc.ref.delete();
    });

    res.redirect('/dashboard');
  } catch (err) {
    console.error('Error removing movie:', err);
    res.status(500).send('Something went wrong');
  }
});


//MARK AS WATCHED

router.post("/mark-watched", isAuthenticated, async (req, res) => {
  const userId = req.session.user?.id;
  if (!userId) {
    console.error("User ID is missing from session");
    return res.redirect("/login");
  }

  const { imdbID, title, poster } = req.body;

  try {
    const watchedRef = db.collection("watchlists").doc(userId).collection("watched").doc(imdbID);
    await watchedRef.set({ imdbID, title, poster });

    res.redirect("/dashboard");
  } catch (err) {
    console.error("Error marking as watched:", err);
    res.status(500).send("Error marking as watched");
  }
});

//REMOVE FROM WATCHED

router.post('/remove-watched', isAuthenticated, async (req, res) => {
  const userId = req.session.user?.id;
  const imdbID = req.body.imdbID;

  try {
    const watchedRef = db.collection('watchlists').doc(userId).collection('watched').doc(imdbID);
    await watchedRef.delete();
    res.redirect('/watched');
  } catch (err) {
    console.error('Error removing watched movie:', err);
    res.status(500).send('Something went wrong');
  }
});

// MOVIE DETAILS

router.get('/movie/:imdbID', async (req, res) => {
  const imdbID = req.params.imdbID;
  const apiKey = process.env.MY_API_KEY;

  try {
    const response = await fetch(`https://www.omdbapi.com/?i=${imdbID}&apikey=${apiKey}`);
    const movie = await response.json();

    res.render('movie-details', { movie });
  } catch (err) {
    console.error(err);
    res.send('Error fetching movie details');
  }
});


module.exports = router;
