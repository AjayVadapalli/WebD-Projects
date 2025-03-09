import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import pkg from 'pg';
const { Pool } = pkg;

// Load environment variables
dotenv.config();

const app = express();
const port = 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Test the connection by running a simple query
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to the Neon database:', err);
  } else {
    console.log('Connected! Server time:', res.rows[0]);
  }
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let quiz = [
  { country: "France", capital: "Paris" },
  { country: "United Kingdom", capital: "London" },
  { country: "United States of America", capital: "New York" },
];

pool.query("SELECT * FROM capitals", (err, res) => {
  if (err) {
    console.error(err.stack);
  }else{
    quiz=res.rows;
  }
});

let totalCorrect = 0;

let currentQuestion = {};

// GET home page
app.get("/", async (req, res) => {
  totalCorrect = 0;
  await nextQuestion();
  console.log(currentQuestion);
  res.render("index.ejs", { question: currentQuestion });
});

// POST a new post
app.post("/submit", (req, res) => {
  let answer = req.body.answer.trim();
  let isCorrect = false;
  if (currentQuestion.capital.toLowerCase() === answer.toLowerCase()) {
    totalCorrect++;
    console.log(totalCorrect);
    isCorrect = true;
  }

  nextQuestion();
  res.render("index.ejs", {
    question: currentQuestion,
    wasCorrect: isCorrect,
    totalScore: totalCorrect,
  });
});

async function nextQuestion() {
  const randomCountry = quiz[Math.floor(Math.random() * quiz.length)];

  currentQuestion = randomCountry;
}

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
