const express = require('express');
const router = express.Router();
const { Task, Category, People } = require('../models');
const { Op } = require('sequelize');

// Middleware to check if a task exists
async function checkTaskExists(req, res, next) {
  const task = await Task.findByPk(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Tâche non trouvée' });
  }
  req.task = task;
  next();
}

// Get all tasks
router.get('/', async (req, res) => {
    try {
        const tasks = await Task.findAll({
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

        const taskData = tasks.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            start_date: task.start_date,
            end_date: task.end_date,
            status: task.status,
            priority: task.priority,
            recurrence: task.recurrence,
            categories: task.categories ? task.categories.map(cat => cat.id) : [],
            people: task.people ? task.people.map(person => person.id) : []
        }));

        res.json(taskData);
    } catch(error) {
        console.error('Erreur lors de la récupération des tâches:', error);
        res.status(500).json({error: 'Erreur serveur'});
    }
});

// Create a new task
router.post('/', async (req, res) => {
    try {
        const { title, description, start_date, end_date, status, priority, recurrence, categories = [], people = [] } = req.body;

        if (!title) {
            return res.status(400).json({error: 'Nom de la tâche manquant'});
        }

        const newTask = await Task.create({
            title,
            description,
            priority,
            status,
            start_date,
            end_date,
            status: status || 'todo',
            priority: priority || 'medium',
            recurrence: recurrence || 'never'
        });

        if (categories.length > 0) {
            await newTask.setCategories(categories);
        }
        if (people.length > 0) {
            await newTask.setPeople(people);
        }

        const createdTask = await Task.findByPk(newTask.id, {
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

        const taskData = {
            id: createdTask.id,
            title: createdTask.title,
            description: createdTask.description,
            start_date: createdTask.start_date,
            end_date: createdTask.end_date,
            status: createdTask.status,
            priority: createdTask.priority,
            recurrence: createdTask.recurrence,
            categories: createdTask.categories.map(cat => cat.id),
            people: createdTask.people.map(person => person.id)
        };

        res.status(201).json(taskData);
    } catch (err) {
        console.error('Erreur lors de la création de la tâche:', err);
        if (err.name === 'SequelizeValidationError') {
            return res.status(400).json({
                error: 'Données invalides',
                details: err.errors.map(e => ({
                    field: e.path,
                    message: e.message
                }))
            });
        }
        res.status(500).json({ error: 'Erreur serveur lors de la création de la tâche' });
    }
});

// Get a task
router.get('/:id', checkTaskExists, async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.id, {
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

        const taskData = {
            id: task.id,
            title: task.title,
            description: task.description,
            start_date: task.start_date,
            end_date: task.end_date,
            status: task.status,
            priority: task.priority,
            recurrence: task.recurrence,
            categories: task.categories.map(cat => cat.id),
            people: task.people.map(person => person.id)
        };

        res.json(taskData);
    } catch (err) {
        console.error('Erreur lors de la récupération de la tâche:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update a task
router.put('/:id', checkTaskExists, async (req, res) => {
    try {
        const { title, description, start_date, end_date, status, priority, recurrence, categories = [], people = [] } = req.body;

        await req.task.update({
            title,
            description,
            start_date,
            end_date,
            status,
            priority,
            recurrence
        });

        if (categories.length > 0) {
            await req.task.setCategories(categories);
        } else {
            await req.task.setCategories([]);
        }

        if (people.length > 0) {
            await req.task.setPeople(people);
        } else {
            await req.task.setPeople([]);
        }

        const updatedTask = await Task.findByPk(req.params.id, {
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

        const taskData = {
            id: updatedTask.id,
            title: updatedTask.title,
            description: updatedTask.description,
            start_date: updatedTask.start_date,
            end_date: updatedTask.end_date,
            status: updatedTask.status,
            priority: updatedTask.priority,
            recurrence: updatedTask.recurrence,
            categories: updatedTask.categories.map(cat => cat.id),
            people: updatedTask.people.map(person => person.id)
        };

        res.json(taskData);
    } catch (err) {
        console.error('Erreur lors de la mise à jour de la tâche:', err);
        if (err.name === 'SequelizeValidationError') {
            return res.status(400).json({
                error: 'Données invalides',
                details: err.errors.map(e => ({
                    field: e.path,
                    message: e.message
                }))
            });
        }
        res.status(500).json({ error: 'Erreur serveur lors de la mise à jour de la tâche' });
    }
});

// Delete a task
router.delete('/:id', checkTaskExists, async (req, res) => {
    try {
        await req.task.destroy();
        res.status(204).send();
    } catch (err) {
        console.error('Erreur lors de la suppression de la tâche:', err);
        res.status(500).json({ error: 'Erreur serveur lors de la suppression de la tâche' });
    }
});

module.exports = router;
