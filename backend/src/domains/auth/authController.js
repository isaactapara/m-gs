const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');
const { toMongoJSON } = require('../../mappers/prismaMapper');
const AppError = require('../../core/appError');
const asyncHandler = require('../../core/asyncHandler');
const { env } = require('../../config/env');
const logger = require('../../core/logger');
const { recordAuditEvent } = require('../audit/auditLogService');

const generateToken = (id) => jwt.sign({ id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

const safeEntityId = (id) => id ? String(id).substring(0, 24) : null;

const loginUser = asyncHandler(async (req, res) => {
  const normalizedUsername = String(req.body.username).toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { username: normalizedUsername } });
  const isValid = user ? await bcrypt.compare(req.body.pin, user.pin) : false;

  if (!user || !isValid) {
    await recordAuditEvent({
      req,
      action: 'auth.login',
      status: 'FAILED',
      metadata: { username: normalizedUsername },
      actor: { actorId: null, actorUsername: normalizedUsername, actorRole: 'anonymous' },
    });

    logger.security('auth_login_failed', {
      requestId: req.requestId,
      username: normalizedUsername,
      ip: req.ip,
    });

    throw new AppError('Invalid username or PIN', 401, 'INVALID_CREDENTIALS');
  }

  const safeUserId = safeEntityId(user.id);

  await recordAuditEvent({
    req,
    action: 'auth.login',
    entityType: 'User',
    entityId: safeUserId,
    metadata: { username: user.username },
  });

  logger.info('auth_login_succeeded', {
    requestId: req.requestId,
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  const responseUser = toMongoJSON(user);

  res.json({
    id: user.id,
    _id: user.id,
    username: user.username,
    role: user.role,
    token: generateToken(user.id),
    expiresIn: env.jwtExpiresIn,
  });
});

const registerUser = asyncHandler(async (req, res) => {
  const normalizedUsername = String(req.body.username).toLowerCase().trim();
  const userExists = await prisma.user.findUnique({ where: { username: normalizedUsername } });

  if (userExists) {
    throw new AppError('A user with this username already exists', 400, 'USER_ALREADY_EXISTS');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPin = await bcrypt.hash(req.body.pin, salt);

  const user = await prisma.user.create({
    data: {
      username: normalizedUsername,
      pin: hashedPin,
      role: req.body.role || 'cashier',
    },
  });

  await recordAuditEvent({
    req,
    action: 'staff.created',
    entityType: 'User',
    entityId: safeEntityId(user.id),
    metadata: {
      username: user.username,
      role: user.role,
    },
  });

  res.status(201).json({
    id: user.id,
    _id: user.id,
    username: user.username,
    role: user.role,
  });
});

const getUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(users.map(toMongoJSON));
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  if (user.role === 'owner') {
    throw new AppError('Cannot delete owner', 400, 'OWNER_DELETE_FORBIDDEN');
  }

  await prisma.user.delete({ where: { id: req.params.id } });

  await recordAuditEvent({
    req,
    action: 'staff.deleted',
    entityType: 'User',
    entityId: safeEntityId(user.id),
    metadata: {
      username: user.username,
      role: user.role,
    },
  });

  res.json({ message: 'User removed' });
});

module.exports = {
  loginUser,
  registerUser,
  getUsers,
  deleteUser,
};
