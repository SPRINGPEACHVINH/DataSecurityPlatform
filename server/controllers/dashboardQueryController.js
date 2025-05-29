// Handles requests from the dashboard (queries Elasticsearch)
import { getOAuth2Token, handleCreateRule, handleRunScan, handleQueryScanResult, handleGetScanStatus } from '../controllers/purviewEventController.js';
import { isAuthenticated } from '../middleware/isAuthenticated.js';

