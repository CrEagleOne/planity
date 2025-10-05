const env = require('./env');

let config;

switch (env.NODE_ENV) {
  case 'development':
    config = require('./dev');
    break;
  case 'test':
    config = require('./test');
    break;
  case 'production':
  default:
    config = require('./prod');
    break;
}

module.exports = config;
