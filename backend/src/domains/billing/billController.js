const prisma = require('../../config/prisma');
const AppError = require('../../core/appError');
const asyncHandler = require('../../core/asyncHandler');
const logger = require('../../core/logger');
const { recordAuditEvent } = require('../audit/auditLogService');
const { PAYMENT_METHOD_MAP, PAYMENT_STATUS_MAP } = require('../../core/constants/paymentConstants');



// No changes needed to constants below since they are removed in the logic edit.


const mapBillForFrontend = (bill) => {
  if (!bill) return null;
  const mapped = { ...bill, _id: bill.id };

  if (mapped.total !== undefined && mapped.total !== null) mapped.total = parseFloat(mapped.total);
  if (mapped.amountPaid !== undefined && mapped.amountPaid !== null) mapped.amountPaid = parseFloat(mapped.amountPaid);
  if (mapped.amountDifference !== undefined && mapped.amountDifference !== null) mapped.amountDifference = parseFloat(mapped.amountDifference);

  if (Array.isArray(mapped.items)) {
    mapped.items = mapped.items.map((item) => ({
      ...item,
      _id: item.id,
      price: item.price !== undefined && item.price !== null ? parseFloat(item.price) : 0,
    }));
  }

  return mapped;
};

const assertBillAccess = (bill, user) => {
  if (user.role === 'owner') return;
  if (String(bill.cashierId) !== String(user._id || user.id)) {
    throw new AppError('Access denied for this bill', 403, 'BILL_ACCESS_FORBIDDEN');
  }
};

const computeBillTotal = (items) => {
  const total = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
  return Number(total.toFixed(2));
};

const generateBillNumber = async () => {
  const count = await prisma.bill.count();
  const sequence = String(count + 1).padStart(4, '0');
  const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  return `M&G's-${sequence}-${randomCode}-${d}${m}${y}`;
};

const getBills = asyncHandler(async (req, res) => {
  const query = req.user.role === 'owner' ? {} : { cashierId: req.user._id || req.user.id };
  const bills = await prisma.bill.findMany({
    where: query,
    include: { items: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(bills.map(mapBillForFrontend));
});

const createBill = asyncHandler(async (req, res) => {
  try {
    logger.info('bill_creation_started', { requestId: req.requestId, itemCount: req.body.items?.length });

    const items = req.body.items.map((item, index) => ({
      menuItemId: item.menuItemId || item.id || item._id || null,
      name: item.name,
      price: Number(item.price),
      quantity: Number(item.quantity),
      sortOrder: index
    }));

    const computedTotal = computeBillTotal(items);
    if (computedTotal <= 0) {
      throw new AppError('Invalid total amount', 400, 'INVALID_TOTAL');
    }

    logger.info('bill_number_generating', { requestId: req.requestId });
    const billNumber = await generateBillNumber();
    logger.info('bill_number_generated', { requestId: req.requestId, billNumber });

    const bill = await prisma.$transaction(async (tx) => {
      logger.info('bill_transaction_started', { requestId: req.requestId });
      
      // 1. Create the bill
      const newBill = await tx.bill.create({
        data: {
          billNumber,
          total: computedTotal,
          paymentMethod: PAYMENT_METHOD_MAP[req.body.paymentMethod] || 'MPESA',
          status: PAYMENT_STATUS_MAP[req.body.status] || 'PENDING',

          cashier: req.user.username,
          cashierId: req.user._id || req.user.id,
          items: {
            create: items
          }
        },
        include: { items: true }
      });


      logger.info('bill_record_created', { requestId: req.requestId, billId: newBill.id });

      // 2. Increment soldCount for each valid menuItemId (Resilient to defunct IDs)
      const uniqueItems = Array.from(new Set(items.filter(i => i.menuItemId).map(i => i.menuItemId)));
      
      for (const id of uniqueItems) {
        const quantity = items.filter(i => i.menuItemId === id).reduce((s, i) => s + i.quantity, 0);
        await tx.menuItem.updateMany({
          where: { id },
          data: { soldCount: { increment: quantity } }
        });
      }

      logger.info('bill_transaction_committing', { requestId: req.requestId });
      return newBill;
    }, {
      timeout: 15000 // 15s timeout for the transaction
    });

    const parsedBill = mapBillForFrontend(bill);

    logger.info('bill_creation_succeeded', {
      requestId: req.requestId,
      billId: parsedBill._id,
      billNumber: parsedBill.billNumber,
    });

    await recordAuditEvent({
      req,
      action: 'bill.created',
      entityType: 'Bill',
      entityId: parsedBill._id,
      metadata: {
        billNumber: parsedBill.billNumber,
        total: parsedBill.total,
        status: parsedBill.status,
      },
    }).catch(err => logger.error('bill_audit_failed', { message: err.message }));

    res.status(201).json(parsedBill);
  } catch (error) {
    logger.error('bill_creation_failed', {
      requestId: req.requestId,
      message: error.message,
      stack: error.stack,
      payload: req.body
    });
    
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to create bill: ' + error.message, 500, 'BILL_CREATION_FAILED');
  }
});


const updateBillStatus = asyncHandler(async (req, res) => {
  const existing = await prisma.bill.findUnique({
    where: { id: req.params.id },
    include: { items: true }
  });

  if (!existing) {
    throw new AppError('Bill not found', 404, 'BILL_NOT_FOUND');
  }

  assertBillAccess(existing, req.user);

  if (existing.status === 'PAID' || existing.status === 'CONFIRMED') {
    if (req.user.role !== 'owner') {
      throw new AppError('Cannot modify a settled bill. Only owners can reopen transactions.', 403, 'BILL_IMMUTABLE');
    }
  }

  const dataToUpdate = {};
  if (req.body.status) {
    dataToUpdate.status = PAYMENT_STATUS_MAP[req.body.status] || req.body.status.toUpperCase();
  }
  if (req.body.paymentMethod) {
    dataToUpdate.paymentMethod = PAYMENT_METHOD_MAP[req.body.paymentMethod] || req.body.paymentMethod.toUpperCase();
  }



  const bill = await prisma.bill.update({
    where: { id: req.params.id },
    data: dataToUpdate,
    include: { items: true }
  });

  const parsedBill = mapBillForFrontend(bill);

  await recordAuditEvent({
    req,
    action: 'bill.status_updated',
    entityType: 'Bill',
    entityId: parsedBill._id,
    metadata: {
      billNumber: parsedBill.billNumber,
      status: parsedBill.status,
      paymentMethod: parsedBill.paymentMethod,
    },
  });

  res.json(parsedBill);
});

const getBillById = asyncHandler(async (req, res) => {
  const bill = await prisma.bill.findUnique({
    where: { id: req.params.id },
    include: { items: true }
  });

  if (!bill) {
    throw new AppError('Bill not found', 404, 'BILL_NOT_FOUND');
  }

  assertBillAccess(bill, req.user);
  res.json(mapBillForFrontend(bill));
});

const deleteBill = asyncHandler(async (req, res) => {
  const bill = await prisma.bill.findUnique({
    where: { id: req.params.id }
  });

  if (!bill) {
    throw new AppError('Bill not found', 404, 'BILL_NOT_FOUND');
  }

  await prisma.bill.delete({
    where: { id: req.params.id }
  });

  await recordAuditEvent({
    req,
    action: 'bill.deleted',
    entityType: 'Bill',
    entityId: bill.id ? String(bill.id).substring(0, 24) : null,
    metadata: {
      billNumber: bill.billNumber,
      total: bill.total ? parseFloat(bill.total) : 0,
    },
  });

  res.json({ message: 'Bill removed' });
});

module.exports = {
  getBills,
  createBill,
  updateBillStatus,
  getBillById,
  deleteBill,
  mapBillForFrontend,
};
