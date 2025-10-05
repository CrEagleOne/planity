const express = require('express');
const router = express.Router();
const { Folder, Note } = require('../models');
const { Op } = require('sequelize');

// Middleware to check if a folder exists
async function checkFolderExists(req, res, next) {
  const folder = await Folder.findByPk(req.params.id);
  if (!folder) {
    return res.status(404).json({ error: 'Dossier non trouvé' });
  }
  req.folder = folder;
  next();
}

// Helper to get all subfolders
async function getAllSubFolders(folderId) {
  const folders = await Folder.findAll({ where: { parentId: folderId } });
  let allFolders = folders;
  for (const folder of folders) {
    const subFolders = await getAllSubFolders(folder.id);
    allFolders = allFolders.concat(subFolders);
  }
  return allFolders;
}

// Get all folders with their hierarchy
router.get('/', async (req, res) => {
  try {
    const folders = await Folder.findAll({
      where: { parentId: null }, // Only root folders
      include: [{
        model: Folder,
        as: 'children',
        include: [{
          model: Folder,
          as: 'children',
          include: [{
            model: Folder,
            as: 'children'
          }]
        }]
      }]
    });
    res.json(folders);
  } catch (error) {
    console.error('Erreur lors de la récupération des dossiers:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create a new folder
router.post('/', async (req, res) => {
  try {
    const { id, name, parentId } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Le nom du dossier est obligatoire' });
    }

    if (id === 'root') {
      const [rootFolder, created] = await Folder.findOrCreate({
        where: { id: 'root' },
        defaults: {
          name: 'Racine',
          parentId: null
        }
      });
      return res.status(200).json(rootFolder);
    }

    if (parentId) {
      const parentFolder = await Folder.findByPk(parentId);
      if (!parentFolder) {
        return res.status(400).json({ error: 'Parent folder does not exist' });
      }
    }

    const folder = await Folder.create({ id, name, parentId });
    return res.status(201).json(folder);
  } catch (err) {
    console.error('Erreur lors de la création du dossier:', err);
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Données invalides',
        details: err.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }
    res.status(500).json({ error: 'Erreur serveur lors de la création du dossier' });
  }
});

// Get a folder with all its children and notes
router.get('/:id', checkFolderExists, async (req, res) => {
  try {
    const folder = await Folder.findByPk(req.params.id, {
      include: [{
        model: Folder,
        as: 'children',
        include: [{
          model: Folder,
          as: 'children',
          include: [{
            model: Folder,
            as: 'children'
          }]
        }]
      }, {
        model: Note,
        as: 'notes'
      }]
    });
    res.json(folder);
  } catch (err) {
    console.error('Erreur lors de la récupération du dossier:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update a folder
router.put('/:id', checkFolderExists, async (req, res) => {
  try {
    const { name, parentId } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Le nom du dossier est obligatoire' });
    }
    await req.folder.update({ name, parentId: parentId || null });
    const updatedFolder = await Folder.findByPk(req.params.id);
    res.json(updatedFolder);
  } catch (err) {
    console.error('Erreur lors de la mise à jour du dossier:', err);
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Données invalides',
        details: err.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour du dossier' });
  }
});

// Delete a folder
router.delete('/:id', checkFolderExists, async (req, res) => {
  try {
    const folderId = req.params.id;
    const recursive = req.query.recursive === 'true';
    // Si suppression récursive
    if (recursive) {
      // 1. Récupérer tous les sous-dossiers de ce dossier (récursivement)
      const allFolders = await getAllSubFolders(folderId);
      // 2. Supprimer toutes les notes associées à ces dossiers
      await Note.destroy({ where: { folderId: { [Op.in]: allFolders.map(f => f.id) } } });
      // 3. Supprimer tous les sous-dossiers
      await Folder.destroy({ where: { id: { [Op.in]: allFolders.map(f => f.id) } } });
    }
    // 4. Supprimer le dossier principal
    await Folder.destroy({ where: { id: folderId } });
    res.status(200).json({ message: 'Folder and contents deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



module.exports = router;
