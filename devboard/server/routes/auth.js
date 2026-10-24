const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const generateToken = (id, tokenVersion) =>
  jwt.sign({ id, tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);

  try {
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }
    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) return res.status(400).json({ message: "User already exists" });
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
    });
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id, user.tokenVersion),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);

  try {
    const user = await User.findOne({ email: normalizedEmail });
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id, user.tokenVersion),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/auth/profile — update your own profile fields (webhookUrl powers outgoing webhooks)
router.put("/profile", protect, async (req, res) => {
  try {
    const { name, githubUsername, avatar, webhookUrl } = req.body;
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    if (typeof name === "string" && name.trim()) user.name = name.trim();
    if (typeof githubUsername === "string") user.githubUsername = githubUsername.trim();
    if (typeof avatar === "string") user.avatar = avatar;
    if (typeof webhookUrl === "string") user.webhookUrl = webhookUrl.trim();
    await user.save();
    res.json({ ...user.toObject() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/logout-all
router.post("/logout-all", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    user.tokenVersion += 1;
    await user.save();

    res.json({ message: "Logged out from all devices" });
  } catch (err) {
    res.status(401).json({ message: "Not authorized, invalid token" });
  }
});

module.exports = router;
