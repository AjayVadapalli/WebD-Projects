const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const { db } = require("./firebase");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); 
app.use(express.static("public")); 
app.set("view engine", "ejs");

app.use(
  session({
    secret: "your_secret_key", 
    resave: false,
    saveUninitialized: true,
  })
);

// Store session globally
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  next();
};

app.get("/", (req, res) => res.render("home"));

app.get("/about", (req, res) => res.render("about"));


app.get("/login", (req, res) => res.render("login"));
app.get("/signup", (req, res) => res.render("signup"));
app.get("/create", requireAuth, (req, res) => res.render("create"));


app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const userRef = await db.collection("users").add({
      email,
      password: hashedPassword,
    });

    req.session.userId = userRef.id;

    console.log("User signed up:", email);
    res.redirect("/blog");
  } catch (error) {
    console.error("Signup error:", error.message);
    res.status(400).send("Error signing up: " + error.message);
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const usersRef = db.collection("users");
    const snapshot = await usersRef.where("email", "==", email).get();

    if (snapshot.empty) {
      return res.status(400).send("User not found");
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    // Compare hashed passwords
    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) {
      return res.status(400).send("Incorrect password");
    }

    req.session.userId = userDoc.id;
    console.log("User logged in:", email);
    res.redirect("/blog");
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(400).send("Error logging in: " + error.message);
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

app.post("/create", requireAuth, async (req, res) => {
  console.log("Received form data:", req.body); // Check what is being received

  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).send("Title and content are required.");
  }

  try {
    await db.collection("posts").add({
      title,
      content,
      userId: req.session.userId,
      createdAt: new Date(),
    });

    console.log("Post created successfully.");
    res.redirect("/blog");
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(400).send("Error creating post: " + error.message);
  }
});

app.post("/delete/:id", requireAuth, async (req, res) => {
  const postId = req.params.id;
  const userId = req.session.userId;

  console.log(`🔍 Attempting to delete post: ${postId}`);
  console.log(`👤 User trying to delete: ${userId}`);

  try {
    const postRef = db.collection("posts").doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      console.log("Post not found.");
      return res.status(404).send("Post not found.");
    }

    console.log(`Post found, owned by: ${postDoc.data().userId}`);

    if (postDoc.data().userId !== userId) {
      console.log("Unauthorized delete attempt.");
      return res.status(403).send("Unauthorized: You can only delete your own posts.");
    }

    await postRef.delete();
    console.log("Post deleted successfully.");
    res.redirect("/blog");
  } catch (error) {
    console.error(" Error deleting post:", error);
    res.status(400).send("Error deleting post: " + error.message);
  }
});

app.get("/blog", requireAuth, async (req, res) => {
  try {
    const postsSnapshot = await db.collection("posts").get();
    const posts = postsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    const userId = req.session.userId || null; 

    console.log("Current userId:", userId); 
    res.render("blog", { posts, userId }); 
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).send("Error loading blog posts.");
  }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
