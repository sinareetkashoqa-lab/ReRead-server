export default function adminAuth(req, res, next) {
  const role = req.headers["x-role"];

  if (role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Admin access only" });
  }
}
