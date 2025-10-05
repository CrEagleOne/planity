const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const openurl = require('openurl');
const path = require('path');
const net = require('net');
const fs = require('fs');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { syncDatabase } = require('./models');
const peopleRoad = require('./roads/people');
const taskRoad = require('./roads/task');
const eventRoad = require('./roads/event');
const CategoryRoad = require('./roads/category');
const ContactRoad = require('./roads/contact');
const NoteRoad = require('./roads/note');
const FolderRoad = require('./roads/folder');
const app = express();

// 🔧 Middleware
app.use(cors());
app.use(errorHandler);
app.use(bodyParser.json());

// 🔗 API routes
app.use('/api/people', peopleRoad);
app.use('/api/task', taskRoad);
app.use('/api/event', eventRoad);
app.use('/api/category', CategoryRoad);
app.use('/api/contact', ContactRoad);
app.use('/api/note', NoteRoad);
app.use('/api/folder', FolderRoad);

logger.debug(`Environment: ${config.NODE_ENV}`)
logger.debug(`Port: ${config.PORT}`)
logger.debug(`Log level: ${config.LOG_LEVEL}`)
logger.debug(`Database: ${config.DATABASE_PATH}`)

// 🔍 Function to find a free port
function findFreePort(startPort = config.port) {
  return new Promise((resolve, reject) => {
    if (startPort > 5100) return reject(new Error('No free ports found'));
    const server = net.createServer();
    server.listen(startPort, () => {
      server.close(() => resolve(startPort));
    });
    server.on('error', () => {
      resolve(findFreePort(startPort + 1));
    });
  });
}

// 🚀 Start the server
async function startServer(port) {
  logger.debug(`Starting on the port ${port}`)
  try {
    await syncDatabase();
    logger.dbSuccess(`Synchronized database`)

    const server = app.listen(port, () => {
      if (config.OPEN_BROWSER) openurl.open(`http://localhost:${port}`);
    });

    server.on('error', (err) => {
      logger.error(`Server: ${err}`)
      process.exit(1);
    });

  } catch (err) {
    logger.error(`Startup failed: ${err}`)
    process.exit(1);
  }
}

// 📦 Detection of the path to the frontend
const clientBuildPath = path.join(__dirname, "..", "..", "client", "build");

// 🔧 Serve frontend React build
logger.debug(`Frontend path: ${clientBuildPath}`);
logger.info(`Recovery of client files`);

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();

  const filePath = path.join(clientBuildPath, req.path);

  if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
    return next();
  }

  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

app.use(express.static(clientBuildPath));

app.get(['/', '*path'], (req, res) => {
  const indexPath = path.join(clientBuildPath, 'index.html');
  res.type('html').send(fs.readFileSync(indexPath, 'utf8'));
});

// 🧠 Start detection and server
findFreePort(config.PORT)
  .then((freePort) => {
    startServer(freePort);
  })
  .catch((err) => {
    logger.error(`Port: ${err}`)
    process.exit(1);
  });

// 🔒 Global error handling
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err}`)
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err}`)
  process.exit(1);
});
