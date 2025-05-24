export const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next(); // User is authenticated, proceed to the next middleware/route handler
  }
  res.status(401).json({ message: "Unauthorized. Please log in." });
};
