import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import session from "express-session";
import dotenv from "dotenv";
import apiRoutes from "./routes/index.js";

dotenv.config(); // Configure dotenv to load .env variables

const PORT = process.env.server_local_port;

const app = express();
app.disable("x-powered-by"); // Disable 'X-Powered-By' header for security reasons

// Use Helmet to help secure Express apps by setting various HTTP headers
app.use(helmet());
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Enable CORS for all routes
// app.use(
//   cors({
//     origin: process.env.frontend_url,
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     credentials: true,
//   })
// );

// Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET, // Store in .env
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    cookie: {
      secure: process.env.NODE_ENV === "production", // True if using https
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

// Use API routes
app.use("/api", apiRoutes);

// Default route
app.get("/", (req, res) => {
  res.send("DSP Server is running!");
});

mongoose
  .connect(`${process.env.MONGODB}`)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.log("Error: ", error);
  });

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
