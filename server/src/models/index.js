const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');
const { getAppTempPath } = require('../utils/utils');

// Importing models
const peopleModel = require('./people');
const taskModel = require('./task');
const categoryModel = require('./category');
const eventModel = require('./event');
const contactModel = require('./contact');
const noteModel = require('./note');
const folderModel = require('./folder');

const storagePath = path.join(getAppTempPath(), 'database.sqlite');
logger.dbInfo(`Use of the database : ${storagePath}`);

// Configuring Sequelize with SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: storagePath,
  dialectModule: require('sqlite3'),
  logging: config.env === 'development' ? console.log : false,
  define: {
    timestamps: true,
    paranoid: true, // soft delete
    underscored: true, // snake_case for columns
  }
});

// Load models
const People = peopleModel(sequelize, DataTypes);
const Task = taskModel(sequelize, DataTypes);
const Category = categoryModel(sequelize, DataTypes);
const Event = eventModel(sequelize, DataTypes);
const Contact = contactModel(sequelize, DataTypes);
const Note = noteModel(sequelize, DataTypes);
const Folder = folderModel(sequelize, DataTypes);


function setupAssociations() {
  const models = {
    People,
    Task,
    Category,
    Event,
    Contact,
    Note,
    Folder
  };

  Object.keys(models).forEach(modelName => {
    if (typeof models[modelName].associate === 'function') {
      logger.dbInfo(`Configuring associations for ${modelName}`);
      models[modelName].associate(models);
    }
  });
}

// Database synchronization
async function syncDatabase() {
  try {
    await sequelize.authenticate();
    logger.dbInfo('Connection to the successfully established SQLite database');
    setupAssociations();
    const syncOptions = { alter: false };

    await sequelize.sync(syncOptions);
    Folder.initializeRootFolder();
    logger.dbInfo('Database successfully synchronized');

  } catch (err) {
    logger.dbError(`Error synchronizing database: ${err}`);
    throw err;
  }
}

module.exports = {
  sequelize,
  syncDatabase,
  People,
  Task,
  Category,
  Event,
  Contact,
  Note,
  Folder
};
