const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const isPkg = typeof process.pkg !== 'undefined';

// 📍 Determines the base path
const basePath = isPkg
  ? path.dirname(process.execPath)
  : path.resolve(__dirname, '../../');

// 📄 Full path to file .env
const envPath = path.join(basePath, '.env');

// 🔍 Check and load the .env
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
  console.log(`✅ .env loaded since : ${envPath}`);
} else {
  console.warn(`⚠️ No.env files found — default values used`);
}

// 📦 Exports configuration with secure fallback
module.exports = {
  NODE_ENV: typeof process.env.NODE_ENV === 'string'
    ? process.env.NODE_ENV.trim()
    : 'production',

  PORT: parseInt(process.env.PORT, 10) || 5000,

  DATABASE_PATH: process.env.DATABASE_PATH || 'server/database.sqlite',

  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  OPEN_BROWSER: process.env.OPEN_BROWSER === 'true'
};
