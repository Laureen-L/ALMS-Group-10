const express = require('express');
const router = express.Router();
const { login, getProfile, forgotPassword } = require('../controllers/authController');


router.post('/login', login);
router.get('/profile/:id', getProfile);
router.post('/forgot-password', forgotPassword);

module.exports = router;