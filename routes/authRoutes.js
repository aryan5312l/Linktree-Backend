const express = require('express');
const csrf = require('csurf');
const { register, login, forgotPassword, resetPassword } = require('../controllers/authController');
const { logout, verifyToken } = require('../middlewares/authMiddleware');
const { getReferrals, getReferralStats } = require('../controllers/referral');
const { limiter } = require('../middlewares/rateLimiter');
const { sanitizeInput, validateRegistration } = require('../middlewares/inputValidation');


const router = express.Router();
const csrfProtection = csrf({ cookie: true });

router.post('/register', limiter, sanitizeInput, validateRegistration, register);
router.post('/login', limiter, sanitizeInput, login);
router.post('/logout', logout);
router.post('/forgot-password', sanitizeInput, forgotPassword);
router.post('/reset-password', resetPassword);

router.get('/referrals', verifyToken, getReferrals);
router.get('/referral-stats', verifyToken, getReferralStats);

module.exports = router;