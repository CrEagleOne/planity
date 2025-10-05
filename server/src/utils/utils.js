const os = require('os');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const logger = require('../utils/logger');

function getAppTempPath(...subfolders) {
  let baseTemp;
  if (config.NODE_ENV === 'production') {
    baseTemp = os.tmpdir();
  } else {
    // root project
    baseTemp = path.resolve(__dirname, '../../../');
  }
  log_server_path = path.join(baseTemp, 'planity', ...subfolders);

  if (!fs.existsSync(log_server_path)) {
    fs.mkdirSync(log_server_path, { recursive: true });
  }
  return log_server_path
}

module.exports = {
  getAppTempPath
};