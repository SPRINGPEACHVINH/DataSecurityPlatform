import bcrypt from "bcryptjs";
import { findUserByUsername, CreateUser } from "../models/userModel.js";

export const signup = async (req, res, next) => {
  const { UserName, Password } = req.body;

  try {
    if (!UserName || !Password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }
    // Check if user already exists
    const existingUser = await findUserByUsername(UserName);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create new user
    const newUser = await CreateUser({
      UserName,
      Password: Password,
    });

    res.status(201).json({
      message: "User created successfully",
      user: {
        UserName: newUser.UserName,
        // AccessToken: newUser.AccessToken,
      },
    });
  } catch (error) {
    console.error("Error during signup:", error);
    return res.status(500).json({ message: "Internal server error during signup" });
  }
};

export const signin = async (req, res, next) => {
  try {
    const { UserName, Password } = req.body;

    if (!UserName || !Password) {
      return res.status(400).json({ message: "Username and password are required." });
    }

    const user = await findUserByUsername(UserName);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." }); // User not found
    }

    const isMatch = await bcrypt.compare(Password, user.Password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." }); // Password incorrect
    }

    // Regenerate session to prevent session fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        console.error("Session regeneration error:", err);
        return res.status(500).json({ message: "Error setting up session." });
      }
      req.session.userId = user._id;
      req.session.username = user.UserName;
      res.status(200).json({
        message: "Signed in successfully.",
        user: { id: user._id, username: user.UserName },
      });
    });
  } catch (error) {
    console.error("Error during signin:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getSession = (req, res) => {
  if (req.session.userId) {
    res.status(200).json({
      isAuthenticated: true,
      user: {
        id: req.session.userId,
        username: req.session.username
      }
    });
  } else {
    res.status(200).json({ isAuthenticated: false });
  }
};

export const logout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      // return next(err);
      return res.status(500).json({ message: 'Could not log out, please try again.' });
    }
    res.clearCookie('connect.sid'); // Default session cookie name, adjust if changed
    res.status(200).json({ message: 'Logged out successfully.' });
  });
};