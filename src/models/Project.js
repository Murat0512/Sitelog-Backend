const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    client: { type: String, required: true, trim: true },
    siteAddress: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    status: { type: String, enum: ['active', 'archived', 'completed', 'on-hold'], default: 'active' },
    archived: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);
