const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const speakeasy = require('speakeasy');  // For 2FA
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');

// Initialize the app
const app = express();
app.use(express.json());
app.use(passport.initialize());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/auth', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// User Schema and Model
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String },
    microsoftId: { type: String },
    twoFactorSecret: { type: String }  // 2FA Secret
});
const User = mongoose.model('User', userSchema);

// Rate limiting middleware
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit to 5 requests per window
    message: "Too many login attempts, please try again later."
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: 'YOUR_GOOGLE_CLIENT_ID',
    clientSecret: 'YOUR_GOOGLE_CLIENT_SECRET',
    callbackURL: 'http://localhost:3000/auth/google/callback'
}, async (token, tokenSecret, profile, done) => {
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

// OAuth login routes
app.get('/auth/google', passport.authenticate('google', { scope: ['email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
    const token = jwt.sign({ id: req.user._id, email: req.user.email }, 'secret', { expiresIn: '1h' });
    res.json({ token });
});

app.get('/auth/microsoft', passport.authenticate('microsoft', { scope: ['user.read'] }));
app.get('/auth/microsoft/callback', passport.authenticate('microsoft', { failureRedirect: '/' }), (req, res) => {
    const token = jwt.sign({ id: req.user._id, email: req.user.email }, 'secret', { expiresIn: '1h' });
    res.json({ token });
});

// 2FA Route (For generating secret and verifying)
app.post('/2fa/generate', async (req, res) => {
    const secret = speakeasy.generateSecret();
    const user = await User.findById(req.body.userId);
    user.twoFactorSecret = secret.base32;
    await user.save();
    res.json({ secret: secret.otpauth_url });
});

app.post('/2fa/verify', async (req, res) => {
    const user = await User.findById(req.body.userId);
    const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: req.body.token
    });
    if (verified) {
        res.send('2FA verified');
    } else {
        res.status(400).send('Invalid 2FA token');
    }
});

// Sign-Up Route
app.post('/signup', async (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    await user.save();
    res.status(201).send('User created successfully');
});

// Login Route
app.post('/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).send('Invalid credentials');

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).send('Invalid credentials');

    // JWT Token Generation
    const token = jwt.sign({ id: user._id, email: user.email }, 'secret', { expiresIn: '1h' });
    res.status(200).json({ token });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
