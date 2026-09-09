import express from "express";
import pgclient from "../db/db.js";
import adminAuth from "../middleware/adminAuth.js";

const router = express.Router();

router.use(adminAuth);

//=====GET ADMIN STATS=====
//GET /api/admin/stats
router.get("/stats", async (req, res) => {
  try {
    const totalUsers = await pgclient.query("SELECT COUNT(*) FROM users");
    const totalBooks = await pgclient.query("SELECT COUNT(*) FROM books");
    const totalRequests = await pgclient.query(
      "SELECT COUNT(*) FROM borrow_requests",
    );
    const activeBorrows = await pgclient.query(
      "SELECT COUNT(*) FROM borrow_requests WHERE status = 'approved'",
    );

    res.json({
      totalUsers: parseInt(totalUsers.rows[0].count),
      totalBooks: parseInt(totalBooks.rows[0].count),
      totalRequests: parseInt(totalRequests.rows[0].count),
      activeBorrows: parseInt(activeBorrows.rows[0].count),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//=====GET ALL USERS=====
//GET /api/admin/users
router.get("/users", async (req, res) => {
  try {
    const result = await pgclient.query(
      `SELECT id, username, email, full_name, location, role, is_suspended, created_at
             FROM users
             ORDER BY created_at DESC`,
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//=====SUSPEND/UNSUSPEND USER=====
//PUT /api/admin/users/:id/suspend
router.put("/users/:id/suspend", async (req, res) => {
  const userId = req.params.id;

  try {
    // Check if user exists
    const userCheck = await pgclient.query(
      "SELECT * FROM users WHERE id = $1",
      [userId],
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userCheck.rows[0];

    const newStatus = !user.is_suspended;

    const result = await pgclient.query(
      `UPDATE users 
             SET is_suspended = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING id, username, email, full_name, role, is_suspended`,
      [newStatus, userId],
    );

    res.json({
      message: newStatus ? "User suspended" : "User unsuspended",
      user: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//=====DELETE USER=====
//DELETE /api/admin/users/:id
router.delete("/users/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const userCheck = await pgclient.query(
      "SELECT * FROM users WHERE id = $1",
      [userId],
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    if (userCheck.rows[0].role === "admin") {
      return res.status(403).json({ message: "Cannot delete admin user" });
    }

    await pgclient.query("DELETE FROM users WHERE id = $1", [userId]);

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//=====GET ALL BOOKS=====
//GET /api/admin/books
router.get("/books", async (req, res) => {
  try {
    const result = await pgclient.query(`
            SELECT 
                b.*,
                u.username as owner_name,
                u.email as owner_email
            FROM books b
            JOIN users u ON b.user_id = u.id
            ORDER BY b.created_at DESC
        `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//=====DELETE BOOK=====
//DELETE /api/admin/books/:id
router.delete("/books/:id", async (req, res) => {
  const bookId = req.params.id;

  try {
    const bookCheck = await pgclient.query(
      "SELECT * FROM books WHERE id = $1",
      [bookId],
    );

    if (bookCheck.rows.length === 0) {
      return res.status(404).json({ message: "Book not found" });
    }

    await pgclient.query("DELETE FROM books WHERE id = $1", [bookId]);

    res.json({ message: "Book deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//=====GET ALL REQUESTS=====
//GET /api/admin/requests
router.get("/requests", async (req, res) => {
  try {
    const result = await pgclient.query(`
            SELECT 
                br.*,
                b.title as book_title,
                requester.username as requester_name,
                owner.username as owner_name
            FROM borrow_requests br
            JOIN books b ON br.book_id = b.id
            JOIN users requester ON br.requester_id = requester.id
            JOIN users owner ON br.owner_id = owner.id
            ORDER BY br.created_at DESC
        `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//=====DELETE REQUEST=====
//DELETE /api/admin/requests/:id
router.delete("/requests/:id", async (req, res) => {
  const requestId = req.params.id;

  try {
    const requestCheck = await pgclient.query(
      "SELECT * FROM borrow_requests WHERE id = $1",
      [requestId],
    );

    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ message: "Request not found" });
    }

    await pgclient.query("DELETE FROM borrow_requests WHERE id = $1", [
      requestId,
    ]);

    res.json({ message: "Request deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
