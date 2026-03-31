const prisma = require('../../config/prisma');
const logger = require('../../core/logger');

const buildActor = (req, actorOverride = null) => {
  if (actorOverride) {
    return actorOverride;
  }

  if (req?.user) {
    return {
      actorId: req.user._id || req.user.id || null,
      actorUsername: req.user.username,
      actorRole: req.user.role,
    };
  }

  return {
    actorId: null,
    actorUsername: 'anonymous',
    actorRole: 'anonymous',
  };
};

const recordAuditEvent = async ({
  req,
  action,
  entityType = 'system',
  entityId = null,
  status = 'SUCCESS',
  metadata = {},
  actor = null,
}) => {
  const actorData = buildActor(req, actor);
  const payload = {
    ...actorData,
    action,
    entityType,
    entityId: entityId ? String(entityId) : null,
    status,
    ipAddress: req?.ip || null,
    requestId: req?.requestId || null,
    metadata: metadata || {},
  };

  logger.audit(action, payload);

  try {
    await prisma.auditLog.create({ data: payload });
  } catch (error) {
    logger.error('audit_log_write_failed', {
      action,
      requestId: req?.requestId,
      message: error.message,
    });
  }
};

module.exports = {
  recordAuditEvent,
};
