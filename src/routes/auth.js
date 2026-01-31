const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { logEvent } = require('../utils/audit');

const router = express.Router();

router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email is required.'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
    body('name').optional().isLength({ max: 120 }).withMessage('Name is too long.')
  ],
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    const { name, email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'Email already in use.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, role: role || 'member' });

    await logEvent({
      action: 'user.register',
      user: { sub: user._id, email: user.email },
      ip: req.ip
    });

    return res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to register user.' });
  }
  }
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required.'),
    body('password').notEmpty().withMessage('Password is required.')
  ],
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(423).json({ message: 'Account temporarily locked. Try again later.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await user.save();
      await logEvent({ action: 'user.login_failed', user: { sub: user._id, email: user.email }, ip: req.ip });
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
    const token = jwt.sign(
      { sub: user._id.toString(), email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: '12h' }
    );

    await logEvent({ action: 'user.login_success', user: { sub: user._id, email: user.email }, ip: req.ip });

    return res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to login.' });
  }
  }
);

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub).select('name email role');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    return res.json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch user profile.' });
  }
});

router.post(
  '/change-password',
  auth,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required.'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters.')
  ],
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.sub);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      await logEvent({ action: 'user.password_change_failed', user: { sub: user._id, email: user.email }, ip: req.ip });
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    await logEvent({ action: 'user.password_changed', user: { sub: user._id, email: user.email }, ip: req.ip });
    return res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to change password.' });
  }
  }
);

router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Valid email is required.')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { email } = req.body;
      const user = await User.findOne({ email: email.toLowerCase() });

      if (user) {
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

        user.resetPasswordTokenHash = resetTokenHash;
        user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
        await user.save();

        await logEvent({
          action: 'user.password_reset_requested',
          user: { sub: user._id, email: user.email },
          ip: req.ip
        });

        const allowTokenResponse = process.env.RESET_PASSWORD_TOKEN_RESPONSE === 'true';
        if (allowTokenResponse) {
          return res.json({
            message: 'If an account exists, a reset token has been generated.',
            resetToken
          });
        }
      }

      return res.json({ message: 'If an account exists, a reset token has been generated.' });
    } catch (error) {
      return res.status(500).json({ message: 'Unable to start password reset.' });
    }
  }
);

router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required.'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters.')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { token, newPassword } = req.body;
      const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const user = await User.findOne({
        resetPasswordTokenHash: resetTokenHash,
        resetPasswordExpires: { $gt: new Date() }
      });

      if (!user) {
        return res.status(400).json({ message: 'Reset token is invalid or expired.' });
      }

      user.passwordHash = await bcrypt.hash(newPassword, 10);
      user.resetPasswordTokenHash = undefined;
      user.resetPasswordExpires = undefined;
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      await user.save();

      await logEvent({
        action: 'user.password_reset_completed',
        user: { sub: user._id, email: user.email },
        ip: req.ip
      });

      return res.json({ message: 'Password updated successfully.' });
    } catch (error) {
      return res.status(500).json({ message: 'Unable to reset password.' });
    }
  }
);

module.exports = router;
