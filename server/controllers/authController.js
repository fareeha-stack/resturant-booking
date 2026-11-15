const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Keep password hashes out of every auth response.
function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
  };
}

function createToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

async function register(req, res, next) {
  try {
    const { name, email, password, phone, role } = req.body;
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, phone, role });

    return res.status(201).json({
      user: publicUser(user),
      token: createToken(user),
    });
  } catch (err) {
    // A unique index also protects against two simultaneous registrations.
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email is already registered' });
    }
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    return res.json({ user: publicUser(user), token: createToken(user) });
  } catch (err) {
    return next(err);
  }
}

function getMe(req, res) {
  return res.json({ user: publicUser(req.user) });
}

module.exports = { register, login, getMe };
