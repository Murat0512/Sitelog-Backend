const express = require('express');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const DailyLog = require('../models/DailyLog');
const Attachment = require('../models/Attachment');
const Project = require('../models/Project');
const User = require('../models/User');
const { logEvent } = require('../utils/audit');

const isAdmin = (req) => req.user?.role === 'admin';

const ensureProjectAccess = async (req, res, projectId) => {
  const project = await Project.findById(projectId);
  if (!project) {
    return { error: res.status(404).json({ message: 'Project not found.' }) };
  }
  if (!isAdmin(req) && project.createdBy.toString() !== req.user.sub) {
    return { error: res.status(403).json({ message: 'Insufficient permissions.' }) };
  }
  return { project };
};

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error('Unsupported file type.'), false);
  }
  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

const uploadToCloudinary = (file) =>
  new Promise((resolve, reject) => {
    const resourceType = file.mimetype === 'application/pdf' ? 'raw' : 'image';
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'site-tracker',
        resource_type: resourceType
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      }
    );
    uploadStream.end(file.buffer);
  });

const deleteFromCloudinary = async (attachment) => {
  if (!attachment?.publicId) return;
  const resourceType = attachment.resourceType || (attachment.mimeType === 'application/pdf' ? 'raw' : 'image');
  try {
    await cloudinary.uploader.destroy(attachment.publicId, { resource_type: resourceType });
  } catch (error) {
    // Ignore Cloudinary delete errors to avoid blocking API response
  }
};

router.post('/projects/:projectId/logs', async (req, res) => {
  try {
    const access = await ensureProjectAccess(req, res, req.params.projectId);
    if (access.error) return;
    const {
      date,
      weather,
      condition,
      folder,
      siteArea,
      activityType,
      summary,
      issuesRisks,
      nextSteps,
      potentialClaim,
      delayCause,
      instructionRef,
      impact,
      costNote
    } = req.body;

    if (!date || !siteArea || !activityType || !summary) {
      return res.status(400).json({ message: 'Missing required log fields.' });
    }

    const normalizedWeather = weather
      ? {
          condition: weather.condition || weather.type || 'other',
          notes: weather.notes || ''
        }
      : condition
        ? { condition, notes: '' }
        : {};

    const log = await DailyLog.create({
      project: req.params.projectId,
      folder: folder || null,
      date,
      weather: normalizedWeather,
      siteArea,
      activityType,
      summary,
      issuesRisks,
      nextSteps,
      potentialClaim: potentialClaim || false,
      delayCause,
      instructionRef,
      impact,
      costNote,
      createdBy: req.user.sub
    });

    await logEvent({
      action: 'log.create',
      user: req.user,
      ip: req.ip,
      details: { logId: log._id, projectId: req.params.projectId }
    });

    return res.status(201).json(log);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to create daily log.' });
  }
});

router.get('/projects/:projectId/logs', async (req, res) => {
  try {
    const access = await ensureProjectAccess(req, res, req.params.projectId);
    if (access.error) return;
    const { startDate, endDate, from, to, activityType, folder, page = 1, limit = 10 } = req.query;
    const query = { project: req.params.projectId };

    if (activityType) {
      query.activityType = activityType;
    }

    if (folder) {
      query.folder = folder;
    }

    if (startDate || endDate || from || to) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      DailyLog.find(query).sort({ date: -1 }).skip(skip).limit(Number(limit)),
      DailyLog.countDocuments(query)
    ]);

    const logIds = logs.map((log) => log._id);
    const attachments = await Attachment.find({ dailyLog: { $in: logIds } });

    return res.json({ logs, attachments, total });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch daily logs.' });
  }
});

router.get('/logs/:id', async (req, res) => {
  try {
    const log = await DailyLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ message: 'Daily log not found.' });
    }
    const access = await ensureProjectAccess(req, res, log.project);
    if (access.error) return;
    const attachments = await Attachment.find({ dailyLog: log._id });
    return res.json({ log, attachments });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch daily log.' });
  }
});

router.get('/logs/:id/attachments', async (req, res) => {
  try {
    const log = await DailyLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ message: 'Daily log not found.' });
    }
    const access = await ensureProjectAccess(req, res, log.project);
    if (access.error) return;
    const attachments = await Attachment.find({ dailyLog: req.params.id }).sort({ uploadedAt: -1 });
    return res.json(attachments);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch attachments.' });
  }
});

router.put('/logs/:id', async (req, res) => {
  try {
    const updates = req.body;
    const existing = await DailyLog.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Daily log not found.' });
    }
    const access = await ensureProjectAccess(req, res, existing.project);
    if (access.error) return;
    const log = await DailyLog.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!log) {
      return res.status(404).json({ message: 'Daily log not found.' });
    }
    return res.json(log);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update daily log.' });
  }
});

router.patch('/logs/:id', async (req, res) => {
  try {
    const updates = req.body;
    const existing = await DailyLog.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Daily log not found.' });
    }
    const access = await ensureProjectAccess(req, res, existing.project);
    if (access.error) return;
    const log = await DailyLog.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!log) {
      return res.status(404).json({ message: 'Daily log not found.' });
    }
    return res.json(log);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update daily log.' });
  }
});

router.delete('/logs/:id', async (req, res) => {
  try {
    const existing = await DailyLog.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Daily log not found.' });
    }
    const access = await ensureProjectAccess(req, res, existing.project);
    if (access.error) return;
    const attachments = await Attachment.find({ dailyLog: req.params.id });
    await Promise.all(attachments.map((attachment) => deleteFromCloudinary(attachment)));
    await Attachment.deleteMany({ dailyLog: req.params.id });

    const log = await DailyLog.findByIdAndDelete(req.params.id);
    if (!log) {
      return res.status(404).json({ message: 'Daily log not found.' });
    }
    await logEvent({
      action: 'log.delete',
      user: req.user,
      ip: req.ip,
      details: { logId: req.params.id }
    });
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: 'Unable to delete daily log.' });
  }
});

router.post('/logs/:id/attachments', upload.array('files', 10), async (req, res) => {
  try {
    const log = await DailyLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ message: 'Daily log not found.' });
    }
    const access = await ensureProjectAccess(req, res, log.project);
    if (access.error) return;
    const { captions, tags } = req.body;

    const attachments = await Promise.all(
      (req.files || []).map(async (file, index) => {
        const captionValue = Array.isArray(captions) ? captions[index] : captions;
        const tagsValue = Array.isArray(tags) ? tags[index] : tags;

        if (captionValue && captionValue.length > 200) {
          throw new Error('Caption must be 200 characters or fewer.');
        }

        const uploadResult = await uploadToCloudinary(file);

        return Attachment.create({
          dailyLog: req.params.id,
          fileUrl: uploadResult.secure_url,
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          filename: uploadResult.public_id,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          publicId: uploadResult.public_id,
          resourceType: uploadResult.resource_type,
          caption: captionValue || '',
          tags: typeof tagsValue === 'string' ? tagsValue.split(',').map((tag) => tag.trim()) : [],
          uploadedBy: req.user.sub,
          createdBy: req.user.sub
        });
      })
    );

    await logEvent({
      action: 'attachment.upload',
      user: req.user,
      ip: req.ip,
      details: { logId: req.params.id, count: attachments.length }
    });

    return res.status(201).json(attachments);
  } catch (error) {
    if (error.message && error.message.includes('Caption')) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unable to upload attachments.' });
  }
});

router.get('/attachments/:id/comments', async (req, res) => {
  try {
    const attachment = await Attachment.findById(req.params.id);
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found.' });
    }
    return res.json(attachment.comments || []);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch comments.' });
  }
});

router.post('/attachments/:id/comments', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Comment text is required.' });
    }

    const attachment = await Attachment.findById(req.params.id);
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found.' });
    }

    const log = await DailyLog.findById(attachment.dailyLog);
    if (!log) {
      return res.status(404).json({ message: 'Daily log not found.' });
    }

    const access = await ensureProjectAccess(req, res, log.project);
    if (access.error) return;

    const user = await User.findById(req.user.sub).select('name email');
    const authorName = user?.name || user?.email || 'User';

    attachment.comments.push({
      text,
      createdBy: req.user.sub,
      authorName
    });

    await attachment.save();
    await logEvent({
      action: 'attachment.comment',
      user: req.user,
      ip: req.ip,
      details: { attachmentId: req.params.id }
    });
    return res.status(201).json(attachment.comments);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to add comment.' });
  }
});

router.delete('/attachments/:id', async (req, res) => {
  try {
    const attachment = await Attachment.findById(req.params.id);
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found.' });
    }
    const log = await DailyLog.findById(attachment.dailyLog);
    if (!log) {
      return res.status(404).json({ message: 'Daily log not found.' });
    }
    const access = await ensureProjectAccess(req, res, log.project);
    if (access.error) return;
    await deleteFromCloudinary(attachment);
    await Attachment.findByIdAndDelete(req.params.id);
    await logEvent({
      action: 'attachment.delete',
      user: req.user,
      ip: req.ip,
      details: { attachmentId: req.params.id }
    });
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: 'Unable to delete attachment.' });
  }
});

module.exports = { router };
