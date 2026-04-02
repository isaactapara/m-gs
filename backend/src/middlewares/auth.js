const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { toMongoJSON } = require('../mappers/prismaMapper');
const { env } = require('../config/env');

const NodeCache = require('node-cache');
const userCache = new NodeCache({ stdTTL: 120, checkperiod: 60 });

const clearUserCache = (id) => userCache.del(id);

const unauthorized = (res, requestId, message, code = 'UNAUTHORIZED') => res.status(401).json({
  success: false,
  error: {
    code,
    message,
    requestId,
  },
});



const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return unauthorized(res, req.requestId, 'Not authorized, no token provided');
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    
    // Check Cache First
    const cachedUser = userCache.get(decoded.id);
    if (cachedUser) {
      req.user = cachedUser;
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, role: true, isActive: true, createdAt: true, updatedAt: true }
    });
    
    if (!user) {
      return unauthorized(res, req.requestId, 'User no longer exists. Please re-authenticate.');
    }

    if (!user.isActive) {
      return unauthorized(res, req.requestId, 'Account has been suspended.', 'ACCOUNT_SUSPENDED');
    }

    const jsonUser = toMongoJSON(user);
    
    // Update Cache
    userCache.set(decoded.id, jsonUser);


    // Refresh lastActiveAt (Rate limited to once per 30 seconds)
    const lastUpdate = userCache.get(`active_${decoded.id}`);
    const UPDATE_INTERVAL = 30 * 1000;

    if (!lastUpdate || (Date.now() - lastUpdate > UPDATE_INTERVAL)) {
      userCache.set(`active_${decoded.id}`, Date.now());
      prisma.user.update({
        where: { id: decoded.id },
        data: { lastActiveAt: new Date() }
      }).catch(err => {}); // Silent catch for background update
    }

    req.user = jsonUser;
    return next();


  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return unauthorized(res, req.requestId, 'Token expired. Please log in again.', 'TOKEN_EXPIRED');
    }

    if (error.name === 'JsonWebTokenError') {
      return unauthorized(res, req.requestId, 'Invalid token signature. Please log in again.', 'INVALID_TOKEN');
    }

    return unauthorized(res, req.requestId, 'Not authorized, token verification failed');
  }
};

const ownerOnly = (req, res, next) => {
  if (req.user?.role === 'owner') {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: {
      code: 'FORBIDDEN',
      message: 'Access denied: Owners only',
      requestId: req.requestId,
    },
  });
};

const staffOnly = (req, res, next) => {
  if (['owner', 'cashier'].includes(req.user?.role)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: {
      code: 'FORBIDDEN',
      message: 'Access denied: Staff only',
      requestId: req.requestId,
    },
  });
};

module.exports = {
  protect,
  ownerOnly,
  staffOnly,
  clearUserCache,
};
