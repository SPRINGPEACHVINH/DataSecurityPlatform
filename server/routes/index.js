// Main router to combine all other route modules
import express from 'express';
import dashboardAPI from './dashboardAPI.js';
import authAPI from './authRoutes.js';
import mlRoutes from './mlRoutes.js';

const router = express.Router();
// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({ message: 'Server is healthy!' });
});

// API routes
router.use('/dashboard', dashboardAPI);
router.use('/auth', authAPI);
router.use('/ml', mlRoutes);

export default router;