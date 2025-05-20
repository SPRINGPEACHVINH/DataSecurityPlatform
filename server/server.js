import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import session from 'express-session';
import apiRoutes from './routes/index.js';

dotenv.config(); // Configure dotenv to load .env variables

const PORT = process.env.server_local_port;

const app = express();
app.disable('x-powered-by'); // Disable 'X-Powered-By' header for security reasons

// Use Helmet to help secure Express apps by setting various HTTP headers
app.use(helmet());

// Enable CORS for all routes
app.use(cors({
  origin: process.env.frontend_url, // Configure for your frontend URL
  credentials: true // Important for sessions/cookies
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_very_secure_secret_key', // Store in .env
  resave: false, // Don't save session if unmodified
  saveUninitialized: false, // Don't create session until something stored
  cookie: {
    secure: process.env.NODE_ENV === 'production', // True if using https
    httpOnly: true, // Prevents client-side JS from reading the cookie
    maxAge: 1000 * 60 * 60 * 24 // Cookie expiry (e.g., 24 hours)
  }
  // For production, you'd use a persistent store like connect-mongo or connect-redis
  // store: new MongoStore({ mongoUrl: process.env.MONGO_URI })
}));

// Use API routes
app.use('/api', apiRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('DSP Server is running!');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});