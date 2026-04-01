const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');
const { toMongoJSON } = require('../../mappers/prismaMapper');
const AppError = require('../../core/appError');
const asyncHandler = require('../../core/asyncHandler');
const { env } = require('../../config/env');
const logger = require('../../core/logger');
const { recordAuditEvent } = require('../audit/auditLogService');
const { clearUserCache } = require('../../middlewares/auth');

const generateToken = (id) => jwt.sign({ id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

const safeEntityId = (id) => id ? String(id).substring(0, 24) : null;

const loginUser = asyncHandler(async (req, res) => {
  const normalizedUsername = String(req.body.username).toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { username: normalizedUsername } });
  
  // Check if user exists and password is valid
  const isValid = user ? await bcrypt.compare(req.body.password, user.password) : false;

  if (!user || !isValid) {
    // Non-blocking audit record
    recordAuditEvent({
      req,
      action: 'auth.login',
      status: 'FAILED',
      metadata: { username: normalizedUsername },
      actor: { actorId: null, actorUsername: normalizedUsername, actorRole: 'anonymous' },
    }).catch(err => logger.error('login_audit_failed', { error: err.message }));

    logger.security('auth_login_failed', {
      requestId: req.requestId,
      username: normalizedUsername,
      ip: req.ip,
    });

    throw new AppError('Invalid username or password', 401, 'INVALID_CREDENTIALS');
  }

  // Check if account is active
  if (!user.isActive) {
    throw new AppError('Your account has been suspended. Please contact the owner.', 403, 'ACCOUNT_SUSPENDED');
  }


  const safeUserId = safeEntityId(user.id);

  // Non-blocking audit record
  recordAuditEvent({
    req,
    action: 'auth.login',
    entityType: 'User',
    entityId: safeUserId,
    metadata: { username: user.username },
  }).catch(err => logger.error('login_audit_failed', { error: err.message }));


  logger.info('auth_login_succeeded', {
    requestId: req.requestId,
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  const responseUser = toMongoJSON(user);
  const token = generateToken(user.id);
  
  res.json({
    ...responseUser,
    token,
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
  const hashedPassword = await bcrypt.hash(req.body.password, salt);

  const user = await prisma.user.create({
    data: {
      username: normalizedUsername,
      password: hashedPassword,
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
    select: { id: true, username: true, role: true, isActive: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(users.map(toMongoJSON));
});

const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    throw new AppError('Password must be at least 8 characters long', 400, 'WEAK_PASSWORD');
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const isMatch = await bcrypt.compare(currentPassword, user.password);

  if (!isMatch) {
    throw new AppError('Current password is incorrect', 401, 'INVALID_PASSWORD');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: req.user.id },
    data: { password: hashedPassword }
  });

  await recordAuditEvent({
    req,
    action: 'user.password_changed',
    entityType: 'User',
    entityId: req.user.id,
    metadata: { username: user.username },
  });

  res.json({ message: 'Password updated successfully' });
});

const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  if (user.role === 'owner') {
    throw new AppError('Cannot suspend owner', 400, 'OWNER_SUSPEND_FORBIDDEN');
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: !user.isActive }
  });

  clearUserCache(req.params.id);

  await recordAuditEvent({
    req,
    action: user.isActive ? 'staff.suspended' : 'staff.activated',
    entityType: 'User',
    entityId: req.params.id,
    metadata: { username: user.username },
  });

  res.json({
    message: `User ${updatedUser.isActive ? 'activated' : 'suspended'} successfully`,
    isActive: updatedUser.isActive
  });
});

const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const targetUserId = req.params.id;

  if (!['owner', 'cashier'].includes(role)) {
    throw new AppError('Invalid role specified', 400, 'INVALID_ROLE');
  }

  const user = await prisma.user.findUnique({ where: { id: targetUserId } });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Prevent self-demotion
  if (user.id === req.user.id && role !== 'owner') {
    throw new AppError('Owners cannot demote themselves. Promote another owner first.', 400, 'SELF_DEMOTION_FORBIDDEN');
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: { role }
  });

  clearUserCache(targetUserId);

  await recordAuditEvent({
    req,
    action: role === 'owner' ? 'staff.elevated' : 'staff.demoted',
    entityType: 'User',
    entityId: targetUserId,
    metadata: { 
      username: user.username,
      newRole: role,
      oldRole: user.role
    },
  });

  res.json({
    message: `User ${user.username} has been ${role === 'owner' ? 'elevated to Owner' : 'demoted to Cashier'} successfully`,
    role: updatedUser.role
  });
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
  
  clearUserCache(req.params.id);

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
  updatePassword,
  toggleUserStatus,
  updateUserRole,
};

