const winston = require("winston");
require("winston-daily-rotate-file");

// Configure a daily rotating log file
const auditLogger = new winston.transports.DailyRotateFile({
  filename: "logs/audit-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d",
});

// creating the logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(), // Log to the console
    auditLogger, // Log to rotating files
  ],
});

module.exports = logger;
