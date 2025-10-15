const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getDashboard, findUser, getTransactionHistory, createTransfer, setTranPin, getRecipientName } = require('../Controllers/user.controller');
const authenticate = require('../Middleware/auth'); 

// Register page
router.get('/signup', (req, res) => {
  // res.render('signup', { error: null, success: null });
  console.log('SignUp Accessed');
});
// Register route
router.post('/register', registerUser);

// Signin page
router.get('/signin', (req, res) => {
  // res.render('signin', { error: null, success: null });
  console.log('SignIn Accessed');
});
// Signin route
router.post('/login', loginUser);
// Fetch dashboard data
router.get('/dashboard', authenticate, getDashboard);

// Get user profile
router.get('/user/:userId', authenticate, findUser);
router.post('/transaction', authenticate, createTransfer);
router.get('/transaction/history', authenticate, getTransactionHistory);
router.post('/set/setpin', authenticate, setTranPin);
router.post("/recipient", authenticate, getRecipientName);


// Get all users (API endpoint)
// router.get('/users', getAllUsers);

module.exports = router;