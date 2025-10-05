const express = require('express');
const router = express.Router();
const { People } = require('../models');
const { Op } = require('sequelize');

// Middleware to check if a person exists
async function checkPeopleExists(req, res, next) {
  const people = await People.findByPk(req.params.id);
  if (!people) {
    return res.status(404).json({ error: 'Personne non trouvée' });
  }
  req.people = people;
  next();
}

// Get all the people
router.get('/', async (req, res) => {
    try {
        const people = await People.findAll()
        const peopleData = people.map(people => ({
            id: people.id,
            last_name: people.last_name,
            first_name: people.first_name,
            birthday_date: people.birthday_date,
            avatar: people.avatar
        }))
        res.json(peopleData)
    } catch(error) {
        console.error('Erreur lors de la récupération des personnes:', error)
        res.status(500).json({error: 'Erreur serveur'})
    }
})

// Create a new person
router.post('/', async (req, res) => {
    try {
        const peopleData = req.body;
        if (!peopleData || !peopleData.last_name) {
            return res.status(400).json({error: 'Nom manquant'})
        }

        if (!peopleData || !peopleData.first_name) {
            return res.status(400).json({error: 'Prénom manquant'})
        }

        if (!peopleData || !peopleData.birthday_date) {
            return res.status(400).json({error: 'Date de naissance manquante'})
        }

        const newPeople= await People.create(peopleData)

        res.status(201).json(newPeople)
    } catch (err) {
        console.error('Erreur lors de la création de la personne:', err);
        if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
            error: 'Données invalides',
            details: err.errors.map(e => ({
            field: e.path,
            message: e.message
            }))
        });
        }
        res.status(500).json({ error: 'Erreur serveur lors de la création de la personne' });
    }
});

// Get a person
router.get('/:id', checkPeopleExists, async (req, res) => {
  try {
    const people = await People.findByPk(req.params.id);

    res.json(people);
  } catch (err) {
    console.error('Erreur lors de la récupération de la personne:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update a person
router.put('/:id', checkPeopleExists, async (req, res) => {
    try {
        const peopleData = req.body
        
        await req.people.update(peopleData);
        const updatedPeople = await People.findByPk(req.params.id)
        res.json(updatedPeople);
    } catch (err) {
        console.error('Erreur lors de la mise à jour de la personne:', err);
        if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
            error: 'Données invalides',
            details: err.errors.map(e => ({
            field: e.path,
            message: e.message
            }))
        });
        }
        res.status(500).json({ error: 'Erreur serveur lors de la mise à jour de la personne' });
    }
});

// Delete a person
router.delete('/:id', checkPeopleExists, async (req, res) => {
    try {
        await req.people.destroy();
        res.status(204).send();
    } catch (err) {
        console.error('Erreur lors de la suppression de la personne:', err);
        res.status(500).json({ error: 'Erreur serveur lors de la suppression de la personne' });
    }
});

module.exports = router;