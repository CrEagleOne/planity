const express = require('express');
const router = express.Router();
const { Contact } = require('../models');
const { Op } = require('sequelize');

// Middleware to check if a contact exists
async function checkContactExists(req, res, next) {
  const contact = await Contact.findByPk(req.params.id);
  if (!contact) {
    return res.status(404).json({ error: 'Contact non trouvé' });
  }
  req.contact = contact;
  next();
}

// Get all contacts
router.get('/', async (req, res) => {
  try {
    const contacts = await Contact.findAll();
    const contactData = contacts.map(contact => ({
      id: contact.id,
      last_name: contact.last_name,
      first_name: contact.first_name,
      birthday_date: contact.birthday_date,
      address: contact.address,
      postal_code: contact.postal_code,
      city: contact.city,
      country: contact.country,
      email: contact.email,
      mobile_phone: contact.mobile_phone,
      fixed_phone: contact.fixed_phone,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt
    }));
    
    res.json(contactData);
  } catch (error) {
    console.error('Erreur lors de la récupération des contacts:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create a new contact
router.post('/', async (req, res) => {
  try {
    const contactData = req.body;
    if (!contactData || !contactData.last_name || !contactData.first_name) {
      return res.status(400).json({ error: 'Nom et prénom sont obligatoires' });
    }
    const newContact = await Contact.create(contactData);
    res.status(201).json(newContact);
  } catch (err) {
    console.error('Erreur lors de la création du contact:', err);
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Données invalides',
        details: err.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }
    res.status(500).json({ error: 'Erreur serveur lors de la création du contact' });
  }
});

// Get a contact
router.get('/:id', checkContactExists, async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id);
    res.json(contact);
  } catch (err) {
    console.error('Erreur lors de la récupération du contact:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update a contact
router.put('/:id', checkContactExists, async (req, res) => {
  try {
    const contactData = req.body;
    await req.contact.update(contactData);
    const updatedContact = await Contact.findByPk(req.params.id);
    res.json(updatedContact);
  } catch (err) {
    console.error('Erreur lors de la mise à jour du contact:', err);
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Données invalides',
        details: err.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour du contact' });
  }
});

// Delete a contact
router.delete('/:id', checkContactExists, async (req, res) => {
  try {
    await req.contact.destroy();
    res.status(204).send();
  } catch (err) {
    console.error('Erreur lors de la suppression du contact:', err);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression du contact' });
  }
});

module.exports = router;
