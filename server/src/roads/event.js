const express = require('express');
const router = express.Router();
const { Event, Category, People } = require('../models');
const { Op } = require('sequelize');

// Middleware to check if an event exists
async function checkEventExists(req, res, next) {
  const event = await Event.findByPk(req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'Événement non trouvé' });
  }
  req.event = event;
  next();
}

// Get all events
router.get('/', async (req, res) => {
    try {
        const events = await Event.findAll({
            include: [
                {
                    model: Category,
                    as: 'categories',
                    through: { attributes: [] }
                },
                {
                    model: People,
                    as: 'people',
                    through: { attributes: [] }
                }
            ]
        });

        const eventData = events.map(event => ({
            id: event.id,
            title: event.title,
            description: event.description,
            start_date: event.start_date,
            end_date: event.end_date,
            color: event.color,
            categories: event.categories.map(cat => cat.id),
            people: event.people.map(person => person.id)
        }));

        res.json(eventData);
    } catch(error) {
        console.error('Erreur lors de la récupération des événements:', error);
        res.status(500).json({error: 'Erreur serveur'});
    }
});

// Create a new event
router.post('/', async (req, res) => {
    try {
        const { title, description, start_date, end_date, color, categories = [], people = [] } = req.body;

        if (!title) {
            return res.status(400).json({error: 'Nom de l\'événement manquant'});
        }

        const newEvent = await Event.create({
            title,
            description,
            start_date,
            end_date,
            color
        });

        if (categories.length > 0) {
            await newEvent.setCategories(categories);
        }

        if (people.length > 0) {
            await newEvent.setPeople(people);
        }

        const createdEvent = await Event.findByPk(newEvent.id, {
            include: [
                {
                    model: Category,
                    as: 'categories',
                    through: { attributes: [] }
                },
                {
                    model: People,
                    as: 'people',
                    through: { attributes: [] }
                }
            ]
        });

        const eventData = {
            id: createdEvent.id,
            title: createdEvent.title,
            description: createdEvent.description,
            start_date: createdEvent.start_date,
            end_date: createdEvent.end_date,
            color: createdEvent.color,
            categories: createdEvent.categories.map(cat => cat.id),
            people: createdEvent.people.map(person => person.id)
        };

        res.status(201).json(eventData);
    } catch (err) {
        console.error('Erreur lors de la création de l\'événement:', err);
        if (err.name === 'SequelizeValidationError') {
            return res.status(400).json({
                error: 'Données invalides',
                details: err.errors.map(e => ({
                    field: e.path,
                    message: e.message
                }))
            });
        }
        res.status(500).json({ error: 'Erreur serveur lors de la création de l\'événement' });
    }
});

// Get an event
router.get('/:id', checkEventExists, async (req, res) => {
    try {
        const event = await Event.findByPk(req.params.id, {
            include: [
                {
                    model: Category,
                    as: 'categories',
                    through: { attributes: [] }
                },
                {
                    model: People,
                    as: 'people',
                    through: { attributes: [] }
                }
            ]
        });

        const eventData = {
            id: event.id,
            title: event.title,
            description: event.description,
            start_date: event.start_date,
            end_date: event.end_date,
            color: event.color,
            categories: event.categories.map(cat => cat.id),
            people: event.people.map(person => person.id)
        };

        res.json(eventData);
    } catch (err) {
        console.error('Erreur lors de la récupération de l\'événement:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update an event
router.put('/:id', checkEventExists, async (req, res) => {
    try {
        const { title, description, start_date, end_date, color, categories = [], people = [] } = req.body;

        await req.event.update({
            title,
            description,
            start_date,
            end_date,
            color
        });

        if (categories.length > 0) {
            await req.event.setCategories(categories);
        } else {
            await req.event.setCategories([]);
        }

        if (people.length > 0) {
            await req.event.setPeople(people);
        } else {
            await req.event.setPeople([]);
        }

        const updatedEvent = await Event.findByPk(req.params.id, {
            include: [
                {
                    model: Category,
                    as: 'categories',
                    through: { attributes: [] }
                },
                {
                    model: People,
                    as: 'people',
                    through: { attributes: [] }
                }
            ]
        });

        const eventData = {
            id: updatedEvent.id,
            title: updatedEvent.title,
            description: updatedEvent.description,
            start_date: updatedEvent.start_date,
            end_date: updatedEvent.end_date,
            color: updatedEvent.color,
            categories: updatedEvent.categories.map(cat => cat.id),
            people: updatedEvent.people.map(person => person.id)
        };

        res.json(eventData);
    } catch (err) {
        console.error('Erreur lors de la mise à jour de l\'événement:', err);
        if (err.name === 'SequelizeValidationError') {
            return res.status(400).json({
                error: 'Données invalides',
                details: err.errors.map(e => ({
                    field: e.path,
                    message: e.message
                }))
            });
        }
        res.status(500).json({ error: 'Erreur serveur lors de la mise à jour de l\'événement' });
    }
});

// Delete an event
router.delete('/:id', checkEventExists, async (req, res) => {
    try {
        await req.event.destroy();
        res.status(204).send();
    } catch (err) {
        console.error('Erreur lors de la suppression de l\'événement:', err);
        res.status(500).json({ error: 'Erreur serveur lors de la suppression de l\'événement' });
    }
});

module.exports = router;
