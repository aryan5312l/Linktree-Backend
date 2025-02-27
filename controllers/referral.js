const Redis = require('ioredis');
const redis = new Redis();

const Reward = require("../models/Reward");
const User = require("../models/User");

exports.getReferrals = async (req, res) => {
    try {
        const userId = req.userId; // Extract from JWT token
        const cacheKey = `referrals:${userId}`;

        // Check Redis cache first
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        }

        // If not cached, fetch from DB
        const user = await User.findById(userId).select('successfulReferrals');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const rewards = await Reward.find({ referrer: userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('referredUser', 'username email');

        const referrals = {
            referralHistory: rewards.map(reward => ({
                referredUser: reward.referredUser.username,
                email: reward.referredUser.email,
                points: reward.points,
                status: reward.status,
                date: reward.createdAt
            }))
        };

        // Store in Redis (expire after 10 minutes)
        await redis.set(cacheKey, JSON.stringify(referrals), 'EX', 600);

        res.status(200).json(referrals);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getReferralStats = async (req, res) => {
    try {
        const userId = req.userId; // Extract from JWT token
        const cacheKey = `referralStats:${userId}`;

        // Check Redis cache first
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        }

        // If not cached, fetch from DB
        const user = await User.findById(userId).select('successfulReferrals');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const rewards = await Reward.find({ referrer: userId }).populate('referredUser', 'username email');

        const referralStats = {
            totalReferrals: user.successfulReferrals,
            totalRewards: rewards.reduce((total, reward) => total + reward.points, 0)
        };

        //Store in Redis (expire after 10 minutes)
        await redis.set(cacheKey, JSON.stringify(referralStats), 'EX', 600);

        res.status(200).json(referralStats);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }

};