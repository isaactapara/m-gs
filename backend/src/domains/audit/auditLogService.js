const prisma = require('../../config/prisma');
const logger = require('../../core/logger');

const buildActor = (req, actorOverride = null) => {
  if (actorOverride) {
    return {
      actorId: actorOverride.actorId || null,
      actorUsername: actorOverride.actorUsername || 'system',
      actorRole: actorOverride.actorRole || 'system',
    };
  }

  const user = req?.user;
  if (user) {
    return {
      actorId: user._id || user.id || null,
      actorUsername: user.username || 'unknown',
      actorRole: user.role || 'unknown',
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
