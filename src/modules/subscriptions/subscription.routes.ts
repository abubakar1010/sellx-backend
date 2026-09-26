import { Router } from 'express';
import { subscriptionController } from './subscription.controller';

const router = Router();

router.get('/', subscriptionController.listActive);

export default router;
