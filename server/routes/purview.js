// Endpoints that Microsoft Purview will call
import express from 'express';
import { getOAuth2Token } from '../controllers/purviewEventController.js';

const router = express.Router();

router.get('/oauth2', getOAuth2Token);

export default router;