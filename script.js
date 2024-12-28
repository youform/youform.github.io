const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const AppleStrategy = require('passport-apple').Strategy;
const speakeasy = require('speakeasy');
const rateLimit = require('express-rate-limit');

// Initialize App
const app = express();
app.use(express.json());
app.use(passport.initialize());

// MongoDB Setup
mongoose.connect('mongodb://localhost:27017/auth', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String },
  googleId: { type: String },
  microsoftId: { type: String },
  appleId: { type: String },
  twoFactorSecret: { type: String },
  recentLogins: [Date]  // Track login attempts for anomaly detection
});

const User = mongoose.model('User', userSchema);

// Rate Limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later.'
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: 'YOUR_GOOGLE_CLIENT_ID',
  clientSecret: 'YOUR_GOOGLE_CLIENT_SECRET',
  callbackURL: 'http://localhost:3000/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  let user = await User.findOne({ googleId: profile.id });
  if (!user) {
    user = new User({ googleId: profile.id, email: profile.emails[0].value });
    await user.save();
  }
  done(null, user);
}));

// Microsoft OAuth Strategy
passport.use(new MicrosoftStrategy({
  clientID: 'YOUR_MICROSOFT_CLIENT_ID',
  clientSecret: 'YOUR_MICROSOFT_CLIENT_SECRET',
  callbackURL: 'http://localhost:3000/auth/microsoft/callback',
  scope: ['user.read']
}, async (accessToken, refreshToken, profile, done) => {
  let user = await User.findOne({ microsoftId: profile.id });
  if (!user) {
    user = new User({ microsoftId: profile.id, email: profile.emails[0].value });
    await user.save();
  }
  done(null, user);
}));

// Apple OAuth Strategy
passport.use(new AppleStrategy({
  clientID: 'YOUR_APPLE_CLIENT_ID',
  teamID: 'YOUR_APPLE_TEAM_ID',
  keyID: 'YOUR_APPLE_KEY_ID',
  privateKeyLocation: 'path_to_private_key.p8',
  callbackURL: 'http://localhost:3000/auth/apple/callback'
}, async (accessToken, refreshToken, profile, done) => {
  let user = await User.findOne({ appleId: profile.id });
  if (!user) {
    user = new User({ appleId: profile.id, email: profile.email });
    await user.save();
  }
  done(null, user);
}));

// Sign Up & Login Routes (Include Behavior & Risk-based authentication)
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ email, password: hashedPassword });
  await user.save();
  res.status(201).send('User created successfully');
});

app.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).send('Invalid credentials');

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) return res.status(400).send('Invalid credentials');

  // Behavior-based, risk assessment logic goes here (e.g., location, device fingerprinting)
  // For simplicity, we skip the advanced behavior checks here.

  // Multi-factor Authentication Check (if enabled)
  if (user.twoFactorSecret) {
    return res.status(401).send('Please complete 2FA');
  }

  // JWT Token Generation
  const token = jwt.sign({ id: user._id, email: user.email }, 'secret', { expiresIn: '1h' });
  res.status(200).json({ token });
});

// Starting the server
app.listen(3000, () => console.log('Server running on port 3000'));
