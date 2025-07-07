// Main router to combine all other route modules
import express from 'express';
import dashboardAPI from './dashboardAPI.js';
import authAPI from './authRoutes.js';
import purviewAPI from './purview.js';
import macieRoutes from './macie.js';
import s3Route from './s3Route.js';


const router = express.Router();
// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({ message: 'Server is healthy!' });
});

// API routes
router.use('/dashboard', dashboardAPI);
router.use('/auth', authAPI);
router.use('/purview', purviewAPI);
router.use('/macie', macieRoutes);
router.use("/s3", s3Route);


export default router;