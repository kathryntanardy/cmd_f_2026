const tokenStore = new Map();

function authMiddleware(req, res, next) {
  const token =
    req.headers.authorization?.replace(/^Bearer\s+/i, "") ||
    req.headers["x-auth-token"];
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }
  const session = tokenStore.get(token);
  if (!session) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
  req.user = session;
  next();
}

module.exports = { tokenStore, authMiddleware };
