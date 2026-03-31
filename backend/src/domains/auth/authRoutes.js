const express = require('express');
const {
  loginUser,
  registerUser,
  getUsers,
  deleteUser,
} = require('./authController');
const { protect, ownerOnly } = require('../../middlewares/auth');
const validateRequest = require('../../middlewares/validateRequest');
const { authLimiter } = require('../../middlewares/rateLimiters');
const {
  loginValidators,
  registerValidators,
  deleteUserValidators,
} = require('../../../validators/authValidators');

const router = express.Router();

router.post('/login', authLimiter, loginValidators, validateRequest, loginUser);
router.post('/register', protect, ownerOnly, registerValidators, validateRequest, registerUser);
router.get('/users', protect, ownerOnly, getUsers);
router.delete('/users/:id', protect, ownerOnly, deleteUserValidators, validateRequest, deleteUser);
router.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = router;
