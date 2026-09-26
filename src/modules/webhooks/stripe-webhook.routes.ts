import { Router } from 'express';
import express from 'express';

import { stripeWebhookController } from './stripe-webhook.controller';

const router = Router();

router.post(
    '/stripe',
    express.raw({ type: 'application/json' }),
    stripeWebhookController.handleWebhook,
);

export default router;
