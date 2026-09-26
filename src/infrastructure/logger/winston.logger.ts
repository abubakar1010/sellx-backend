import winston from 'winston';

import { config } from '@/config';
import type { ILogger } from '@/core/interfaces/logger.interface';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const developmentFormat = combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    errors({ stack: true }),
    printf(({ timestamp: ts, level, message, stack, ...meta }) => {
        const metadata = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        return `${ts} ${level}: ${stack ?? message}${metadata}`;
    }),
);

const productionFormat = combine(timestamp(), errors({ stack: true }), json());

const loggerInstance = winston.createLogger({
    level: config.isDevelopment ? 'debug' : 'info',
    format: config.isProduction ? productionFormat : developmentFormat,
    defaultMeta: { service: 'backend-api', environment: config.env },
    transports: [new winston.transports.Console({ stderrLevels: ['error'] })],
    silent: config.isTest,
});

export const logger: ILogger = {
    info: (message, meta) => loggerInstance.info(message, meta),
    warn: (message, meta) => loggerInstance.warn(message, meta),
    error: (message, meta) => loggerInstance.error(message, meta),
    debug: (message, meta) => loggerInstance.debug(message, meta),
    http: (message, meta) => loggerInstance.http(message, meta),
};
