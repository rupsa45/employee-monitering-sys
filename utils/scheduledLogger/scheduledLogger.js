const winston = require('winston');
const path = require('path');

// Create scheduled logger
const scheduledLogger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'scheduled-notifications' },
    transports: [
        // Write all logs with importance level of `error` or less to `scheduled-error.log`
        new winston.transports.File({ 
            filename: path.join(__dirname, '../../logs/scheduled-error.log'), 
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // Write all logs with importance level of `info` or less to `scheduled.log`
        new winston.transports.File({ 
            filename: path.join(__dirname, '../../logs/scheduled.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    ]
});

// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
if (process.env.NODE_ENV !== 'production') {
    scheduledLogger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

module.exports = scheduledLogger;

