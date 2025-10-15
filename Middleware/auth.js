// middleware/auth.js
const jwt = require('jsonwebtoken');
const userModel = require('../Models/user.model');

const authenticate = async (req, res, next) => {
  // Get the token from the Authorization header
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Verify the token using JWT_SECRET_KEY
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    
    // Find the user in the database
    const user = await userModel.findById(decoded._id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Attach user to the request
    req.user = user;
    console.log('Authenticated user:', user.email); // Debug log
    next(); // Proceed to the route handler
  } catch (error) {
    console.error('Authentication error:', error.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authenticate;