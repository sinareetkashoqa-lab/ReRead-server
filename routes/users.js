import express from "express";
import pgclient from "../db/db.js";

const router = express.Router();

//=====GET USER PROFILE=====
router.get("/profile", async (req, res) => {
  const userId = req.headers["user-id"];

  if (!userId) {
    return res.status(401).json({ message: "User ID required" });
  }

  try {
    const result = await pgclient.query(
      `SELECT id, username, email, full_name, location, bio, role, created_at
             FROM users 
             WHERE id = $1`,
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//=====UPDATE USER PROFILE=====
router.put("/profile", async (req, res) => {
  const userId = req.headers["user-id"];
  const { full_name, username, email, location, bio } = req.body;

  if (!userId) {
    return res.status(401).json({ message: "User ID required" });
  }

  try {
    const checkExisting = await pgclient.query(
      `SELECT * FROM users 
             WHERE (username = $1 OR email = $2) AND id != $3`,
      [username, email, userId],
    );

    if (checkExisting.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "Username or email already taken" });
    }

    const result = await pgclient.query(
      `UPDATE users 
             SET full_name = $1, username = $2, email = $3, location = $4, bio = $5, updated_at = CURRENT_TIMESTAMP
             WHERE id = $6
             RETURNING id, username, email, full_name, location, bio, role`,
      [full_name, username, email, location, bio, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//=====DELETE USER ACCOUNT=====
router.delete("/profile", async (req, res) => {
  const userId = req.headers["user-id"];

  if (!userId) {
    return res.status(401).json({ message: "User ID required" });
  }

  try {
    const userCheck = await pgclient.query(
      "SELECT * FROM users WHERE id = $1",
      [userId],
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    await pgclient.query("DELETE FROM users WHERE id = $1", [userId]);

    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//=====GET USER STATS=====
router.get("/stats", async (req, res) => {
  const userId = req.headers["user-id"];

  if (!userId) {
    return res.status(401).json({ message: "User ID required" });
  }

  try {
    const booksOwned = await pgclient.query(
      "SELECT COUNT(*) FROM books WHERE user_id = $1",
      [userId],
    );

    const booksBorrowed = await pgclient.query(
      "SELECT COUNT(*) FROM borrow_requests WHERE requester_id = $1 AND status = 'approved'",
      [userId],
    );

    const pendingRequests = await pgclient.query(
      "SELECT COUNT(*) FROM borrow_requests WHERE owner_id = $1 AND status = 'pending'",
      [userId],
    );

    const reviewsWritten = await pgclient.query(
      "SELECT COUNT(*) FROM reviews WHERE reviewer_id = $1",
      [userId],
    );

    res.json({
      booksOwned: parseInt(booksOwned.rows[0].count),
      booksBorrowed: parseInt(booksBorrowed.rows[0].count),
      pendingRequests: parseInt(pendingRequests.rows[0].count),
      reviewsWritten: parseInt(reviewsWritten.rows[0].count),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
