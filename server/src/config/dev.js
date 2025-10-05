const env = require('./env');

module.exports = {
  ...env,
  DATABASE_PATH: 'server/database.sqlite',
  LOG_LEVEL: 'debug'
};
