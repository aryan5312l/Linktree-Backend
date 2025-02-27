const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    referralCode: { type: String, unique: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    successfulReferrals: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  });



  module.exports = mongoose.model('User', userSchema);