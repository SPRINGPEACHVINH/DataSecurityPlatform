// Endpoints that Microsoft Purview will call
import express from 'express';
import { getOAuth2Token, handleCreateRule, handleRunScan } from '../controllers/purviewEventController.js';

const router = express.Router();

router.get('/oauth2', getOAuth2Token);
router.put('/create-classification-rules', handleCreateRule);
router.post('/run-scan', handleRunScan);

export default router;