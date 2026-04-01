import { Router } from 'express';
import { quotesController } from './quotes.controller';

const router = Router();

// GET  /public/quotes/:token          — view quote (no auth needed)
router.get('/quotes/:token', quotesController.getPublic.bind(quotesController));

// POST /public/quotes/:token/respond  — sign or reject (no auth needed)
router.post('/quotes/:token/respond', quotesController.respondPublic.bind(quotesController));

export default router;
