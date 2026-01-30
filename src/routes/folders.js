const express = require('express');
const LogFolder = require('../models/LogFolder');
const Project = require('../models/Project');

const router = express.Router();

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

router.get('/projects/:projectId/folders', async (req, res) => {
  try {
    const access = await ensureProjectAccess(req, res, req.params.projectId);
    if (access.error) return;

    const folders = await LogFolder.find({ project: req.params.projectId }).sort({ createdAt: -1 });
    return res.json(folders);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch folders.' });
  }
});

router.post('/projects/:projectId/folders', async (req, res) => {
  try {
    const access = await ensureProjectAccess(req, res, req.params.projectId);
    if (access.error) return;

    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Folder name is required.' });
    }

    const folder = await LogFolder.create({
      project: req.params.projectId,
      name,
      createdBy: req.user.sub
    });

    return res.status(201).json(folder);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to create folder.' });
  }
});

router.patch('/folders/:id', async (req, res) => {
  try {
    const { name } = req.body;
    const folder = await LogFolder.findById(req.params.id);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found.' });
    }

    const access = await ensureProjectAccess(req, res, folder.project);
    if (access.error) return;

    folder.name = name || folder.name;
    await folder.save();

    return res.json(folder);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update folder.' });
  }
});

router.delete('/folders/:id', async (req, res) => {
  try {
    const folder = await LogFolder.findById(req.params.id);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found.' });
    }

    const access = await ensureProjectAccess(req, res, folder.project);
    if (access.error) return;

    await LogFolder.findByIdAndDelete(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: 'Unable to delete folder.' });
  }
});

module.exports = router;
