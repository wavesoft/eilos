const winston = require('winston')

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.printf((info) => {
      const {
        timestamp, level, message, ...args
      } = info

      const ts = timestamp.slice(0, 19).replace('T', ' ')
      return `${ts} [${level}]: ${message}`
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'eilos-error.log', level: 'error' })
  ]
})

module.exports = logger
