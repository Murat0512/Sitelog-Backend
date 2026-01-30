const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userEmail: { type: String, trim: true },
    ip: { type: String, trim: true },
    details: { type: Object }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
