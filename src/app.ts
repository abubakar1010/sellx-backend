import hpp from 'hpp';
import compression from 'compression';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import express, { type RequestHandler } from 'express';

import apiV1Routes from '@/routes/v1';
import shareRoutes from '@/routes/share.routes';
import webhookRoutes from '@/modules/webhooks/stripe-webhook.routes';
import { config } from '@config/index';
import { deepLinkService } from '@shared/utils/deep-link.service';
import { catchAsync } from '@shared/utils/catchAsync';
import { notFound } from '@shared/middlewares/notFound';
import { HTTP_STATUS } from '@core/constants/httpStatus';
import { requestId } from '@shared/middlewares/requestId';
import { sendResponse } from '@shared/utils/sendResponse';
import { HealthService } from '@infra/health/health.service';
import { httpLogger } from '@infra/logger/morgan.middleware';
import { idempotency } from '@shared/middlewares/idempotency';
import { renderLandingPage } from '@shared/utils/landingPage';
import { requestContext } from '@shared/middlewares/requestContext';
import { globalRateLimiter } from '@shared/middlewares/rateLimiter';
import { UPLOAD_DIRECTORY } from '@/infrastructure/storage/local-storage';
import { globalErrorHandler } from '@shared/middlewares/globalErrorHandler';
import { registerZodErrorMessages } from '@shared/utils/zodErrors';

registerZodErrorMessages();

const requestTimeout: RequestHandler = (req, res, next) => {
    const controller = new AbortController();

    Object.defineProperty(req, 'signal', {
        value: controller.signal,
        writable: false,
        configurable: true,
    });

    const timeout = setTimeout(() => {
        controller.abort();
    }, config.app.requestTimeoutMs);

    res.on('close', () => clearTimeout(timeout));
    res.on('finish', () => clearTimeout(timeout));

    next();
};

const app = express();
const healthService = new HealthService();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(requestId);
app.use(requestContext);
app.use(requestTimeout);
app.use(httpLogger);

// Deep link verification files and share redirect (before Helmet to avoid CSP blocking inline script)
app.get('/.well-known/apple-app-site-association', (_req, res) => {
    res.set('Cache-Control', 'public, max-age=3600');
    res.type('application/json').json(deepLinkService.getAppleAppSiteAssociation());
});
app.get('/.well-known/assetlinks.json', (_req, res) => {
    res.set('Cache-Control', 'public, max-age=3600');
    res.type('application/json').json(deepLinkService.getAndroidAssetLinks());
});
app.use('/share', shareRoutes);

app.use(helmet());
app.use(hpp());
app.use(
    cors({
        // `origin: true` reflected whatever Origin the caller sent, which with
        // credentials:true lets any site make authenticated cross-origin requests.
        // Allowlist comes from CORS_ORIGIN; the Socket.IO server already used it.
        origin(origin, callback) {
            // Native apps and server-to-server calls send no Origin header.
            if (!origin || config.app.corsOrigins.includes(origin)) {
                callback(null, true);
                return;
            }
            callback(new Error(`Origin ${origin} is not allowed by CORS`));
        },
        credentials: true,
    }),
);
app.use(compression());
app.use(globalRateLimiter);
app.use(idempotency());
app.use(
    '/uploads',
    (_req, res, next) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        // Uploads are user-supplied. A sandboxed, script-free policy stops any
        // script-bearing file already on disk (an SVG, say) from executing against
        // this origin. New SVG uploads are rejected in multer.config.ts.
        res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
        res.setHeader('X-Content-Type-Options', 'nosniff');
        next();
    },
    express.static(UPLOAD_DIRECTORY),
);

// Stripe webhook needs raw body for signature verification — must be BEFORE express.json()
app.use('/api/v1/webhooks', webhookRoutes);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

app.get('/', (_req, res) => {
    const page = renderLandingPage({
        name: config.app.name,
        apiPrefix: config.app.apiPrefix,
        realtimePath: config.realtime.path,
        env: config.env,
        timestamp: new Date().toISOString(),
        uptimeSeconds: process.uptime(),
    });
    res.status(HTTP_STATUS.OK).type('html').send(page);
});

app.get(
    '/health',
    catchAsync(async (req, res) => {
        const report = await healthService.check(req.signal);
        const statusCode =
            report.status === 'down' ? HTTP_STATUS.SERVICE_UNAVAILABLE : HTTP_STATUS.OK;

        return sendResponse(res, {
            statusCode,
            message: 'Health report fetched successfully.',
            data: {
                ...report,
                uptimeSeconds: Number(process.uptime().toFixed(2)),
                environment: config.env,
            },
        });
    }),
);

app.use(config.app.apiPrefix, apiV1Routes);
app.use(notFound);
app.use(globalErrorHandler);

export { app };
