const express = require('express');
const {
  getMenu,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
} = require('./menuController');
const { protect, ownerOnly } = require('../../middlewares/auth');
const validateRequest = require('../../middlewares/validateRequest');
const {
  addMenuItemValidators,
  updateMenuItemValidators,
  deleteMenuItemValidators,
} = require('../../../validators/menuValidators');

const router = express.Router();

router.route('/')
  .get(protect, getMenu)
  .post(protect, ownerOnly, addMenuItemValidators, validateRequest, addMenuItem);

router.route('/:id')
  .patch(protect, ownerOnly, updateMenuItemValidators, validateRequest, updateMenuItem)
  .delete(protect, ownerOnly, deleteMenuItemValidators, validateRequest, deleteMenuItem);

module.exports = router;
