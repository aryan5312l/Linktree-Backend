const User = require("../models/User");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Token = require('../models/Token');
const sendEmail = require('../utils/sendEmail');
const Reward = require("../models/Reward");

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password strength validation (at least 8 chars, one uppercase, one lowercase, one number)
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;

exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const referralUsername = req.query.referral; // Extract referral username from URL

        if (!username || !email || !password) {
            return res.status(400).json({
                message: 'Please fill in all fields',
                success: false
            });
        }

        // Check if email is valid
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Check if password meets the strength criteria
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                error: 'Password must be at least 8 characters long, include one uppercase letter, one lowercase letter, and one number'
            });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({
                error: 'Email or Username already exists'
            });
        }

        const saltRound = 10;
        const hashedPassword = await bcrypt.hash(password, saltRound);

        let referredBy = null;

        // Check if referralUsername exists and get the referrer’s _id
        if (referralUsername) {
            const referrer = await User.findOne({ username: referralUsername });
            if (!referrer) {
                return res.status(400).json({ error: "Invalid referral code" });
            }

            // Reject if referral code is expired (assume expiration = 7 days after referrer's creation)
            const EXPIRATION_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
            if (Date.now() - referrer.createdAt.getTime() > EXPIRATION_TIME) {
                return res.status(400).json({ error: "Referral code has expired" });
            }
            
            referredBy = referrer._id;
            
        }

        let newUser = new User({
            username,
            email,
            password: hashedPassword,
            referredBy,
            referralCode: `${process.env.FRONTEND_URL}/register?referral=${username}`
        });

        // Save the user first
        newUser = await newUser.save();


        // If referred by someone, update their successfulReferrals count & add a reward
        if (referredBy) {
            const referrer = await User.findById(referredBy);
            if (referrer) {
                referrer.successfulReferrals += 1;
                await referrer.save();

                // Store reward in Reward Schema
                await Reward.create({
                    referrer: referredBy,
                    referredUser: newUser._id,
                    points: 10, // Example reward points
                    status: 'Credited'
                });
            }
        }

        res.status(201).json({ message: 'User registered successfully!' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { emailOrUsername, password } = req.body;

        // Check if the user exists (search by email OR username)
        const user = await User.findOne({
            $or: [{ email: emailOrUsername }, { username: emailOrUsername }]
        });

        if (!user) {
            return res.status(401).json({
                error: 'Invalid email/username or password user not found'
            });
        }

        // Validate the password
        console.log("Stored password hash:", user.password);

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                error: 'Invalid email/username or password password incorrect'
            });
        }

        const tokenData = {
            userId: user._id,
            username: user.username,
            email: user.email
        };

        // Generate JWT token
        const token = jwt.sign(
            tokenData,
            process.env.JWT_SECRET,
            { expiresIn: '1d' } // Token expires in 1 day
        );

        // Set the token in an HttpOnly cookie
        res.cookie('token', token, {
            httpOnly: true,  // Prevents JavaScript access (mitigates XSS)
            secure: req.secure || process.env.NODE_ENV === 'production',  // Ensure secure mode
            sameSite: 'Strict',  // Prevent CSRF
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        res.status(200).json({
            message: 'Login successful'
        });

    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.logout = (req, res) => {
    res.cookie('token', '', { httpOnly: true, expires: new Date(0) });
    res.status(200).json({ message: 'Logout successful' });
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate a reset token
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Store token in database
        await Token.create({ userId: user._id, token: resetToken });

        // Send email with reset link
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        await sendEmail(user.email, 'Password Reset Request', `Click the link to reset your password: ${resetLink}`);

        res.json({ message: 'Password reset email sent' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        const storedToken = await Token.findOne({ token });
        if (!storedToken) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user password
        await User.findByIdAndUpdate(storedToken.userId, { password: hashedPassword });

        // Delete the token after use
        await Token.findByIdAndDelete(storedToken._id);

        res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
