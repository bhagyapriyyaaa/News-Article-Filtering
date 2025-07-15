const express = require("express");
const bodyParser = require("body-parser");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes"); // New feedback routes
const cors = require("cors");

const app = express();

// 🛠 Fix: CORS Configuration to Allow Frontend Requests
app.use(
  cors({
    origin: "http://localhost:3000", // Frontend URL
    credentials: true, // Allow cookies and authentication headers
  })
);

// Middleware
app.use(bodyParser.json());

// Connect to MongoDB
connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/feedback", feedbackRoutes); // New feedback route

// 🛠 Fix: Added a missing User Profile Route
app.get("/api/user/profile", (req, res) => {
  res.json({ message: "User profile route working!" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));