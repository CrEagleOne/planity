const path = require('path');
const chalk = require('chalk');
const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const config = require('../config');
const { getAppTempPath } = require('./utils');

const logServerPath = getAppTempPath('logs', 'server');

const levelColors = {
  error: chalk.redBright,
  warn: chalk.yellowBright,
  success: chalk.greenBright,
  info: chalk.blueBright,
  debug: chalk.gray
};

const emojis = {
  error: '❌',
  warn: '⚠️',
  success: '✅',
  info: 'ℹ️',
  debug: '🐛'
};

const padLevel = level => level.toUpperCase().padEnd(7);

const consoleFormat = format.printf(({ level, message, timestamp }) => {
  const color = levelColors[level] || chalk.white;
  const emoji = emojis[level] || '';
  const paddedLevel = padLevel(level);
  return color(`[${timestamp}] ${paddedLevel} ${emoji} : ${message}`);
});

const fileFormat = format.printf(({ level, message, timestamp }) => {
  const emoji = emojis[level] || '';
  const paddedLevel = padLevel(level);
  return `[${timestamp}] ${paddedLevel} ${emoji} : ${message}`;
});

const logger = createLogger({
  levels: {
    error: 0,
    warn: 1,
    success: 2,
    info: 3,
    debug: 4
  },
  level: config.LOG_LEVEL || 'info',
  transports: [
    new transports.Console({
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        consoleFormat
      )
    }),
    new DailyRotateFile({
      filename: path.join(logServerPath, 'server-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      zippedArchive: false,
      maxSize: '10m',
      maxFiles: '14d',
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        fileFormat
      )
    })
  ]
});

['info', 'error', 'success', 'warn', 'debug'].forEach(level => {
  logger[`db${level.charAt(0).toUpperCase() + level.slice(1)}`] = message => {
    logger[level](chalk.magenta(`[DB] ${message}`));
  };
});

logger.info(`Logs disponibles sous ${logServerPath}`);

module.exports = logger;
