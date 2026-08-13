require('dotenv').config();
const express = require('express');

const cors = require("cors");
const app = express();
app.use(cors());

// 5001, not 5000: macOS gives port 5000 to the AirPlay Receiver, where it
// answers requests with a 403 that looks like a bug in this server. The
// frontend's default VITE_API_BASE_URL points here too.
const PORT = process.env.PORT || 5001;

// Global Middleware
app.use(express.json());

// Main Resource Routing Matrix
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/books', require('./src/routes/bookRoutes'));
app.use('/api', require('./src/routes/borrowRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));
app.use('/api/students', require('./src/routes/studentRoutes'));

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