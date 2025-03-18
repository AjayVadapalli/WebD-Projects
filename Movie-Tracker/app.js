const express = require("express");
const session = require("express-session");
const passport = require("passport");
const bodyParser = require("body-parser");
const axios = require('axios');
require("dotenv").config();
const { db } = require('./firebase/config');

const authRoutes = require('./routes/auth');
const movieRoutes = require('./routes/movie');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.set("view engine", "ejs");

// Session & Passport
app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());


// Set user for all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || req.user || null;
  res.locals.title = 'Movie Watchlist';
  next();
});

// Routes
app.use('/', authRoutes);
app.use('/', movieRoutes);

// Pages
const keywords = ['horror','telugu','marvel', 'hollywood','batman', 'spiderman', 'action', 'comedy', 'drama','disney', 'adventure', 'fantasy'];

app.get("/", async (req, res) => {
  const apiKey = process.env.MY_API_KEY;
  const randomKeywords = [];

  while (randomKeywords.length < 12) {
    const rand = keywords[Math.floor(Math.random() * keywords.length)];
    if (!randomKeywords.includes(rand)) {
      randomKeywords.push(rand);
    }
  }

  const moviePromises = randomKeywords.map(async (keyword) => {
    const response = await axios.get(`http://www.omdbapi.com/?s=${encodeURIComponent(keyword)}&apikey=${apiKey}`);
    const results = response.data.Search || [];
    if (results.length > 0) {
      return results[Math.floor(Math.random() * results.length)];
    }
    return null;
  });

  try {
    let movies = await Promise.all(moviePromises);
    movies = movies.filter(movie => movie); 

    res.render("home", {
      title: "Home",
      movies,
      user: req.session.user || null
    });
  } catch (err) {
    console.error("Error fetching random movies:", err.message);
    res.render("home", {
      title: "Home",
      movies: [],
      user: req.session.user || null
    });
  }
});

app.get("/login", (req, res) => res.render("login", { title: "Login" }));

app.get("/signup", (req, res) => res.render("signup", { title: "Signup" }));


app.get("/dashboard", (req, res) => {
  res.render("dashboard", { title: "Dashboard", watchlist: [] });
});

app.get("/watched", async (req, res) => {
  const userId = req.session.user?.id;
  if (!userId) {
    return res.redirect("/login");
  }

  const watchedRef = db.collection("watchlists").doc(userId).collection("watched");

  try {
    const snapshot = await watchedRef.get();
    const watched = snapshot.docs.map(doc => doc.data());

    res.render("watched", { watched }); 
  } catch (err) {
    console.error("Error fetching watched movies:", err);
    res.render("watched", { watched: [] });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
