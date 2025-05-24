import express from 'express';
import { isAuthenticated } from '../middleware/isAuthenticated.js';

const router = express.Router();

// Public API
router.get('/public', isAuthenticated, (req, res) => {
  res.json({ message: 'This is a public API response.' });
});

export default router;