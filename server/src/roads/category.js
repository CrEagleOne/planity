const express = require('express');
const router = express.Router();
const { Category } = require('../models');
const { Op } = require('sequelize');

// Middleware to check if a category exists
async function checkCategoryExists(req, res, next) {
  const category = await Category.findByPk(req.params.id);
  if (!category) {
    return res.status(404).json({ error: 'Catégorie non trouvée' });
  }
  req.category = category;
  next();
}

// Get all categories
router.get('/', async (req, res) => {
    try {
        const category = await Category.findAll()
        const categoryData = category.map(category => ({
            id: category.id,
            title: category.title,
            description: category.description,
            start_date: category.start_date,
            end_date: category.end_date,
            color: category.color,
            people_id: category.people_id
        }))
        res.json(categoryData)
    } catch(error) {
        console.error('Erreur lors de la récupération des catégories:', error)
        res.status(500).json({error: 'Erreur serveur'})
    }
})

// Create a new category
router.post('/', async (req, res) => {
    try {
        const categoryData = req.body;
        if (!categoryData || !categoryData.title) {
            return res.status(400).json({error: 'Nom de la catégorie manquante'})
        }

        const newCategory= await Category.create(categoryData)

        res.status(201).json(newCategory)
    } catch (err) {
        console.error('Erreur lors de la création de la catégorie:', err);
        if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
            error: 'Données invalides',
            details: err.errors.map(e => ({
            field: e.path,
            message: e.message
            }))
        });
        }
        res.status(500).json({ error: 'Erreur serveur lors de la création de la catégorie' });
    }
});

// Get a category
router.get('/:id', checkCategoryExists, async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);

    res.json(category);
  } catch (err) {
    console.error('Erreur lors de la récupération de la catégorie:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update a category
router.put('/:id', checkCategoryExists, async (req, res) => {
    try {
        const categoryData = req.body

        await req.category.update(categoryData);
        const updatedCategory = await Category.findByPk(req.params.id)
        res.json(updatedCategory);
    } catch (err) {
        console.error('Erreur lors de la mise à jour de la catégorie:', err);
        if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
            error: 'Données invalides',
            details: err.errors.map(e => ({
            field: e.path,
            message: e.message
            }))
        });
        }
        res.status(500).json({ error: 'Erreur serveur lors de la mise à jour de la catégorie' });
    }
});

// Delete a category
router.delete('/:id', checkCategoryExists, async (req, res) => {
    try {
        await req.category.destroy();
        res.status(204).send();
    } catch (err) {
        console.error('Erreur lors de la suppression de la catégorie:', err);
        res.status(500).json({ error: 'Erreur serveur lors de la suppression de la catégorie' });
    }
});

module.exports = router;