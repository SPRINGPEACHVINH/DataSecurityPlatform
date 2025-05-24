import express from 'express';
import { signin, signup, logout, getSession } from "../controllers/authController.js";

const router = express.Router();

router.post('/signup', signup);
router.post('/signin', signin);
router.post('/logout', logout);
router.get('/session', getSession);

export default router;