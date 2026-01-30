const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    dailyLog: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyLog', required: true },
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    filename: { type: String },
    publicId: { type: String },
    resourceType: { type: String },
    originalName: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    caption: { type: String, trim: true, maxlength: 200 },
    comments: [
      {
        text: { type: String, required: true, trim: true, maxlength: 500 },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        authorName: { type: String, trim: true },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    tags: [{ type: String, trim: true }],
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Attachment', attachmentSchema);
