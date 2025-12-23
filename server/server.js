import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import session from "express-session";
import dotenv from "dotenv";
import apiRoutes from "./routes/index.js";
import { CreateUser, findUserByUsername } from "./models/userModel.js"

dotenv.config(); // Configure dotenv to load .env variables

const PORT = process.env.SERVER_LOCAL_PORT;

const app = express();
app.disable("x-powered-by"); // Disable 'X-Powered-By' header for security reasons

// Use Helmet to help secure Express apps by setting various HTTP headers
app.use(helmet());
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Enable CORS for all routes
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.SERVER_SESSION_USE_HTTPS === 'true',
      httpOnly: true,
      maxAge: 1000 * 60 * 180, // 3 hours
    },
  })
);

// Use API routes
app.use("/api", apiRoutes);

// Default route
app.get("/", (req, res) => {
  res.send("DSP Server is running!");
});

// Function to create default admin user if not exists
const initializeAdminUser = async () => {
  try {
    const adminUsername = process.env.ADMIN_USERNAME || "admin";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin";

    // Check if admin user already exists
    const existingAdmin = await findUserByUsername(adminUsername);

    if (!existingAdmin) {
      // Create admin user
      await CreateUser({
        UserName: adminUsername,
        Password: adminPassword,
      });
      console.log(`Admin user '${adminUsername}' created successfully`);
    } else {
      console.log(`Admin user '${adminUsername}' already exists`);
    }
  } catch (error) {
    console.error("Error initializing admin user:", error.message);
  }
};

mongoose
  .connect(`${process.env.MONGODB}`)
  .then(async () => {
    console.log("Connected to MongoDB");
    await initializeAdminUser();
  })
  .catch((error) => {
    console.log("Error: ", error);
  });

app.listen(PORT, () => {
  console.log(`Server running at http://127.0.0.1:${PORT}`);
});
