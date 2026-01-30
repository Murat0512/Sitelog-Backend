const AuditLog = require('../models/AuditLog');

const logEvent = async ({ action, user, ip, details }) => {
  try {
    await AuditLog.create({
      action,
      userId: user?.sub,
      userEmail: user?.email,
      ip,
      details
    });
  } catch (error) {
    // Avoid blocking requests if audit logging fails
  }
};

module.exports = { logEvent };
