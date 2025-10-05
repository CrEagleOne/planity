const express = require('express');
const router = express.Router();
const { Note } = require('../models');
const { Op } = require('sequelize');

// Middleware to check if a note exists
async function checkNoteExists(req, res, next) {
  const note = await Note.findByPk(req.params.id);
  if (!note) {
    return res.status(404).json({ error: 'Note non trouvée' });
  }
  req.note = note;
  next();
}

// Get all notes with optional folder filtering
router.get('/', async (req, res) => {
  try {
    const { folderId } = req.query;
    let where = {};

    if (folderId !== undefined) {
      where.folderId = folderId === 'null' ? null : folderId;
    }

    const notes = await Note.findAll({ where });
    const noteData = notes.map(note => ({
      id: note.id,
      title: note.title,
      content: note.content,
      folderId: note.folderId, // Include folderId in response
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    }));
    res.json(noteData);
  } catch (error) {
    console.error('Erreur lors de la récupération des notes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create a new note with folder support
router.post('/', async (req, res) => {
  try {
    const { title, content, folderId } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Titre et contenu sont obligatoires' });
    }
    const newNote = await Note.create({
      title,
      content,
      folderId: folderId || null // Allow null for root-level notes
    });
    res.status(201).json(newNote);
  } catch (err) {
    console.error('Erreur lors de la création de la note:', err);
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Données invalides',
        details: err.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }
    res.status(500).json({ error: 'Erreur serveur lors de la création de la note' });
  }
});

// Get a specific note
router.get('/:id', checkNoteExists, async (req, res) => {
  try {
    const note = await Note.findByPk(req.params.id);
    res.json({
      id: note.id,
      title: note.title,
      content: note.content,
      folderId: note.folderId,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    });
  } catch (err) {
    console.error('Erreur lors de la récupération de la note:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update a note with folder support
router.put('/:id', checkNoteExists, async (req, res) => {
  try {
    const { title, content, folderId } = req.body;
    await req.note.update({
      title,
      content,
      folderId: folderId || null
    });
    const updatedNote = await Note.findByPk(req.params.id);
    res.json(updatedNote);
  } catch (err) {
    console.error('Erreur lors de la mise à jour de la note:', err);
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Données invalides',
        details: err.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour de la note' });
  }
});

// Delete a note
router.delete('/:id', checkNoteExists, async (req, res) => {
  try {
    await req.note.destroy();
    res.status(204).send();
  } catch (err) {
    console.error('Erreur lors de la suppression de la note:', err);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression de la note' });
  }
});

module.exports = router;
