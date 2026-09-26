import morgan from 'morgan';

import { config } from '@/config';
import { logger } from './winston.logger';

const stream = {
    write: (message: string): void => {
        logger.http(message.trim());
    },
};

export const httpLogger = morgan(config.isProduction ? 'combined' : 'dev', {
    stream,
    skip: () => config.isTest,
});
