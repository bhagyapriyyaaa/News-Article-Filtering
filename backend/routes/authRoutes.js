const express = require("express");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();

// Register a new user
router.post("/register", async (req, res) => {
  const { name, email, password, language, categories } = req.body;

  console.log("Registration request received:", {
    name,
    email,
    password,
    language,
    categories,
  });

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("User already exists");
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash the password before saving
    //  const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const user = new User({
      name,
      email,
      password,
      language,
      categories,
    });
    await user.save();

    console.log("User registered successfully:", user);
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Error during registration:", err);
    res.status(500).json({ error: "An error occurred. Please try again." });
  }
});

// Login user
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  console.log("Login request received:", { email, password });

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found");
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Compare plaintext password with hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("Password does not match");
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, "secretkey", {
      expiresIn: "1h",
    });

    console.log("Login successful, token generated:", token);
    res.status(200).json({ token });
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;