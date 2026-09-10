import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production' ? winston.format.json() : winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, stack }) => {
        return `${timestamp} ${level}: ${message}${stack ? `\n${stack}` : ''}`;
      })
    )
  ),
  transports: [
    new winston.transports.Console()
  ],
});
