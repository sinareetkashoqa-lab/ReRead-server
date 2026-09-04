import express from "express";
import pgclient from "../db/db.js";

const router = express.Router();

//===== CREATE BORROW REQUEST =====
//POST /api/borrow-requests
router.post("/", async (req, res) => {
  const { book_id, message } = req.body;
  const requester_id = req.headers["user-id"];

  if (!requester_id) {
    return res.status(401).json({ message: "User ID required" });
  }

  try {
    const bookCheck = await pgclient.query(
      "SELECT * FROM books WHERE id = $1",
      [book_id],
    );

    if (bookCheck.rows.length === 0) {
      return res.status(404).json({ message: "Book not found" });
    }

    const book = bookCheck.rows[0];

    if (!book.is_available) {
      return res.status(400).json({ message: "Book is not available" });
    }

    if (book.user_id === parseInt(requester_id)) {
      return res
        .status(400)
        .json({ message: "You cannot request your own book" });
    }

    const existingRequest = await pgclient.query(
      `SELECT * FROM borrow_requests 
             WHERE book_id = $1 AND requester_id = $2 AND status = 'pending'`,
      [book_id, requester_id],
    );

    if (existingRequest.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "You already have a pending request for this book" });
    }

    const result = await pgclient.query(
      `INSERT INTO borrow_requests (book_id, requester_id, owner_id, message)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
      [book_id, requester_id, book.user_id, message],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//=====GET USER'S SENT REQUESTS=====
// GET /api/borrow-requests
router.get("/", async (req, res) => {
  const userId = req.headers["user-id"];

  if (!userId) {
    return res.status(401).json({ message: "User ID required" });
  }

  try {
    const result = await pgclient.query(
      `
            SELECT 
                br.*,
                b.title as book_title,
                b.author as book_author,
                b.cover_image_url,
                u.username as owner_name,
                u.full_name as owner_full_name
            FROM borrow_requests br
            JOIN books b ON br.book_id = b.id
            JOIN users u ON br.owner_id = u.id
            WHERE br.requester_id = $1
            ORDER BY br.created_at DESC
        `,
      [userId],
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//=====GET USER'S RECEIVED REQUESTS=====
//GET /api/borrow-requests/received
router.get("/received", async (req, res) => {
  const userId = req.headers["user-id"];

  if (!userId) {
    return res.status(401).json({ message: "User ID required" });
  }

  try {
    const result = await pgclient.query(
      `
            SELECT 
                br.*,
                b.title as book_title,
                b.author as book_author,
                b.cover_image_url,
                u.username as requester_username,
                u.full_name as requester_full_name
            FROM borrow_requests br
            JOIN books b ON br.book_id = b.id
            JOIN users u ON br.requester_id = u.id
            WHERE br.owner_id = $1
            ORDER BY br.created_at DESC
        `,
      [userId],
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//=====APPROVE BORROW REQUEST=====
//PUT /api/borrow-requests/:id/approve
router.put("/:id/approve", async (req, res) => {
  const requestId = req.params.id;
  const userId = req.headers["user-id"];

  try {
    const requestCheck = await pgclient.query(
      "SELECT * FROM borrow_requests WHERE id = $1",
      [requestId],
    );

    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ message: "Request not found" });
    }

    const request = requestCheck.rows[0];

    if (request.owner_id !== parseInt(userId)) {
      return res
        .status(403)
        .json({ message: "Only the book owner can approve this request" });
    }

    if (request.status !== "pending") {
      return res
        .status(400)
        .json({ message: "This request has already been processed" });
    }

    // Check if book is still available
    const bookCheck = await pgclient.query(
      "SELECT * FROM books WHERE id = $1",
      [request.book_id],
    );

    if (!bookCheck.rows[0].is_available) {
      return res.status(400).json({ message: "Book is no longer available" });
    }

    await pgclient.query("BEGIN");

    const updateRequest = await pgclient.query(
      `UPDATE borrow_requests 
             SET status = 'approved', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
      [requestId],
    );

    await pgclient.query(
      "UPDATE books SET is_available = false WHERE id = $1",
      [request.book_id],
    );

    await pgclient.query("COMMIT");

    res.json(updateRequest.rows[0]);
  } catch (error) {
    await pgclient.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//=====DECLINE BORROW REQUEST=====
//PUT /api/borrow-requests/:id/decline
router.put("/:id/decline", async (req, res) => {
  const requestId = req.params.id;
  const userId = req.headers["user-id"];

  try {
    const requestCheck = await pgclient.query(
      "SELECT * FROM borrow_requests WHERE id = $1",
      [requestId],
    );

    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ message: "Request not found" });
    }

    const request = requestCheck.rows[0];

    if (request.owner_id !== parseInt(userId)) {
      return res
        .status(403)
        .json({ message: "Only the book owner can decline this request" });
    }

    if (request.status !== "pending") {
      return res
        .status(400)
        .json({ message: "This request has already been processed" });
    }

    const result = await pgclient.query(
      `UPDATE borrow_requests 
             SET status = 'declined', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
      [requestId],
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//=====MARK BOOK AS RETURNED=====
//PUT /api/borrow-requests/:id/return
router.put("/:id/return", async (req, res) => {
  const requestId = req.params.id;
  const userId = req.headers["user-id"];

  try {
    const requestCheck = await pgclient.query(
      "SELECT * FROM borrow_requests WHERE id = $1",
      [requestId],
    );

    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ message: "Request not found" });
    }

    const request = requestCheck.rows[0];

    if (request.owner_id !== parseInt(userId)) {
      return res
        .status(403)
        .json({ message: "Only the book owner can mark as returned" });
    }

    if (request.status !== "approved") {
      return res
        .status(400)
        .json({ message: "Only approved requests can be marked as returned" });
    }

    await pgclient.query("BEGIN");

    const updateRequest = await pgclient.query(
      `UPDATE borrow_requests 
             SET status = 'returned', return_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
      [requestId],
    );

    await pgclient.query("UPDATE books SET is_available = true WHERE id = $1", [
      request.book_id,
    ]);

    await pgclient.query("COMMIT");

    res.json(updateRequest.rows[0]);
  } catch (error) {
    await pgclient.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//=====CANCEL BORROW REQUEST=====
//DELETE /api/borrow-requests/:id
router.delete("/:id", async (req, res) => {
  const requestId = req.params.id;
  const userId = req.headers["user-id"];

  try {
    const requestCheck = await pgclient.query(
      "SELECT * FROM borrow_requests WHERE id = $1",
      [requestId],
    );

    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ message: "Request not found" });
    }

    const request = requestCheck.rows[0];

    const role = req.headers["x-role"];
    if (request.requester_id !== parseInt(userId) && role !== "admin") {
      return res
        .status(403)
        .json({ message: "You can only cancel your own requests" });
    }

    if (request.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending requests can be cancelled" });
    }

    const result = await pgclient.query(
      "DELETE FROM borrow_requests WHERE id = $1 RETURNING *",
      [requestId],
    );

    res.json({ message: "Request cancelled", request: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
