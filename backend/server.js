require('dotenv').config();
const express = require('express');

const authRoutes = require('./src/routes/authRoutes')
const cors = require("cors");
const app = express();
app.use(cors());

const PORT = process.env.PORT || 5000;

// Global Middleware
app.use(express.json());

// Main Resource Routing Matrix
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/books', require('./src/routes/bookRoutes'));
app.use('/api', require('./src/routes/borrowRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));

//Base Health-Check Route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message:"ALMS Backend API Boilerplate is up and running!",
    timestamp: new Date().toISOString()
  });
  console.log("✅ Health Check Successful: ALMS Backend API is operational.");
});

app.use( (err,req,res,next) =>{
    console.error("❌ Global Error Handler:", err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
} );

app.listen(PORT, () => {
  console.log(`🚀 Backend server actively running on port ${PORT}`);
});