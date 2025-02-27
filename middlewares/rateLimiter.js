const rateLimit = require('express-rate-limit');

exports.limiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 10 requests per windowMs
    message: { error: 'Too many requests, please try again later.' },
    headers: true
});