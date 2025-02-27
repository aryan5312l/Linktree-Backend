const { body, validationResult } = require('express-validator');
const xss = require('xss');

exports.validateRegistration = [
    body('username').trim().notEmpty().escape().withMessage('Username is required'),
    body('email').isEmail().normalizeEmail().withMessage('Invalid email format'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

// Middleware to sanitize user input (XSS protection)
exports.sanitizeInput = (req, res, next) => {
    for (let key in req.body) {
        if (typeof req.body[key] === 'string') {
            req.body[key] = xss(req.body[key]); // Prevent XSS
        }
    }
    next();
};
