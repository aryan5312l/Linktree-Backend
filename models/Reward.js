const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
    referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Existing user
    referredUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // New user
    points: { type: Number, default: 10 }, // Reward per referral
    status: { type: String, enum: ['Pending', 'Credited'], default: 'Pending' }, // Reward status
    createdAt: { type: Date, default: Date.now }
});



module.exports = mongoose.model('Reward', rewardSchema);