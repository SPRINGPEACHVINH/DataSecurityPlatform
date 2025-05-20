import express from 'express';
const router = express.Router();

// Public API
router.get('/public', (_, res) => {
  res.json({ message: 'This is a public API response.' });
});

export default router;