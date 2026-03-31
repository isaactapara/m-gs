const express = require('express');
const {
  getBills,
  createBill,
  updateBillStatus,
  getBillById,
  deleteBill,
} = require('./billController');
const { protect, ownerOnly } = require('../../middlewares/auth');
const validateRequest = require('../../middlewares/validateRequest');
const {
  createBillValidators,
  updateBillStatusValidators,
  billIdValidators,
} = require('../../../validators/billValidators');

const router = express.Router();

router.route('/')
  .get(protect, getBills)
  .post(protect, createBillValidators, validateRequest, createBill);

router.route('/:id')
  .get(protect, billIdValidators, validateRequest, getBillById)
  .patch(protect, updateBillStatusValidators, validateRequest, updateBillStatus)
  .delete(protect, ownerOnly, billIdValidators, validateRequest, deleteBill);

module.exports = router;
