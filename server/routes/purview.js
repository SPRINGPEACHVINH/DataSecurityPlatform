// Endpoints that Microsoft Purview will call
import express from 'express';
import { getOAuth2Token, handleCreateRule, handleRunScan } from '../controllers/purviewEventController.js';
import { isAuthenticated } from '../middleware/isAuthenticated.js';

const router = express.Router();

router.get('/oauth2', isAuthenticated, getOAuth2Token);
router.put('/create-classification-rules', isAuthenticated, handleCreateRule);
router.post('/run-scan',isAuthenticated, handleRunScan);

export default router;