// MongoUser.js
// filepath: /Users/apple/Documents/Flash/src/db/models/MongoUser.js

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  picture: { type: String, required: true } // base64 string
});

module.exports = mongoose.model('MongoUser', UserSchema);