const express = require('express');
const Project = require('../models/Project');
const DailyLog = require('../models/DailyLog');
const Attachment = require('../models/Attachment');
const LogFolder = require('../models/LogFolder');
const { v2: cloudinary } = require('cloudinary');
const { createProjectReport } = require('../utils/report');
const requireRole = require('../middleware/requireRole');
const { logEvent } = require('../utils/audit');

const isAdmin = (req) => req.user?.role === 'admin';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
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

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { name, client, siteAddress, startDate, endDate, status } = req.body;

    if (!name || !client || !siteAddress || !startDate) {
      return res.status(400).json({ message: 'Missing required project fields.' });
    }

    const project = await Project.create({
      name,
      client,
      siteAddress,
      startDate,
      endDate: endDate || null,
      status: status || 'active',
      createdBy: req.user.sub
    });

    await logEvent({
      action: 'project.create',
      user: req.user,
      ip: req.ip,
      details: { projectId: project._id, name: project.name }
    });

    return res.status(201).json(project);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to create project.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { status, archived } = req.query;
    const query = {};

    if (!isAdmin(req)) {
      query.createdBy = req.user.sub;
    }

    if (status) {
      query.status = status;
    }

    if (archived !== undefined) {
      query.archived = archived === 'true';
    }

    const projects = await Project.find(query).sort({ createdAt: -1 });
    return res.json(projects);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch projects.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }
    if (!isAdmin(req) && project.createdBy.toString() !== req.user.sub) {
      return res.status(403).json({ message: 'Insufficient permissions.' });
    }
    return res.json(project);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch project.' });
  }
});

router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const updates = req.body;
    const project = await Project.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }
    await logEvent({
      action: 'project.update',
      user: req.user,
      ip: req.ip,
      details: { projectId: project._id }
    });
    return res.json(project);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update project.' });
  }
});

router.patch('/:id', requireRole('admin'), async (req, res) => {
  try {
    const updates = req.body;
    const project = await Project.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }
    await logEvent({
      action: 'project.update',
      user: req.user,
      ip: req.ip,
      details: { projectId: project._id }
    });
    return res.json(project);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update project.' });
  }
});

router.patch('/:id/archive', requireRole('admin'), async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { archived: true, status: 'archived' },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }
    await logEvent({
      action: 'project.archive',
      user: req.user,
      ip: req.ip,
      details: { projectId: project._id }
    });

    return res.json(project);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to archive project.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    if (!isAdmin(req) && project.createdBy.toString() !== req.user.sub) {
      return res.status(403).json({ message: 'Insufficient permissions.' });
    }

    const logs = await DailyLog.find({ project: project._id }).select('_id');
    const logIds = logs.map((log) => log._id);

    const attachments = await Attachment.find({ dailyLog: { $in: logIds } });
    await Promise.all(attachments.map((attachment) => deleteFromCloudinary(attachment)));
    await Attachment.deleteMany({ dailyLog: { $in: logIds } });
    await DailyLog.deleteMany({ project: project._id });
    await LogFolder.deleteMany({ project: project._id });
    await Project.findByIdAndDelete(project._id);

    await logEvent({
      action: 'project.delete',
      user: req.user,
      ip: req.ip,
      details: { projectId: project._id }
    });

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: 'Unable to delete project.' });
  }
});

router.get('/:id/report', async (req, res) => {
  try {
    const { startDate, endDate, folder, logIds: logIdsQuery } = req.query;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }
    if (!isAdmin(req) && project.createdBy.toString() !== req.user.sub) {
      return res.status(403).json({ message: 'Insufficient permissions.' });
    }

    const query = { project: req.params.id };
    if (folder) {
      query.folder = folder;
    }
    if (logIdsQuery) {
      const ids = String(logIdsQuery)
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      if (ids.length) {
        query._id = { $in: ids };
      }
    }
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const logs = await DailyLog.find(query).sort({ date: -1 });
    const logIdList = logs.map((log) => log._id);
    const attachments = await Attachment.find({ dailyLog: { $in: logIdList } });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="project-report.pdf"');

    await createProjectReport({ res, project, logs, attachments });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to generate report.' });
  }
});

router.get('/:id/reports/daily', async (req, res) => {
  try {
    const { from, to, folder, logIds: logIdsQuery } = req.query;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }
    if (!isAdmin(req) && project.createdBy.toString() !== req.user.sub) {
      return res.status(403).json({ message: 'Insufficient permissions.' });
    }

    const query = { project: req.params.id };
    if (folder) {
      query.folder = folder;
    }
    if (logIdsQuery) {
      const ids = String(logIdsQuery)
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      if (ids.length) {
        query._id = { $in: ids };
      }
    }
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    const logs = await DailyLog.find(query).sort({ date: -1 });
    const logIdList = logs.map((log) => log._id);
    const attachments = await Attachment.find({ dailyLog: { $in: logIdList } });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="project-report.pdf"');

    await createProjectReport({ res, project, logs, attachments });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to generate report.' });
  }
});

module.exports = router;
