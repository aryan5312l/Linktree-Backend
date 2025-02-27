const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes.js');
const connectDB = require('./config/db.js');
const cookieParser = require('cookie-parser');


dotenv.config();
const app = express();
app.use(express.json());


app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 
app.use(cookieParser());

// Routes
app.use('/api', authRoutes);


// Start the server
/*
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    connectDB();
    console.log(`Listening on Port ${PORT}`)
});
*/

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Listening on Port ${PORT}`));
}

module.exports = app;