const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const MongoUser = require('../../db/models/MongoUser');

// REGISTER
const register = async (req, res, next) => {
  try {
    const { username, password, picture } = req.body;
    if (!username || !password || !picture) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const existing = await MongoUser.findOne({ username });
    if (existing) return res.status(409).json({ error: 'Username already exists' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await MongoUser.create({ username, password: hashed, picture });
    res.status(201).json({ success: true, user: { id: user._id, username: user.username } });
  } catch (error) {
    next(error);
  }
};

// LOGIN
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await MongoUser.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    // Generate JWT token
    const token = jwt.sign({ userId: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.json({ success: true, token, user: { id: user._id, username: user.username, photo: user.picture } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login
};