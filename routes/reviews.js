import express from "express";
import pgclient from "../db/db.js";

const router = express.Router();

//=====GET REVIEWS FOR A BOOK=====
//GET /api/reviews/book/:bookId
router.get("/book/:bookId", async (req, res) => {
  const { bookId } = req.params;

  try {
    const result = await pgclient.query(
      `
            SELECT 
                r.*,
                u.username as reviewer_name,
                u.full_name as reviewer_full_name
            FROM reviews r
            JOIN users u ON r.reviewer_id = u.id
            WHERE r.book_id = $1
            ORDER BY r.created_at DESC
        `,
      [bookId],
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//=====ADD A REVIEW=====
//POST /api/reviews
router.post("/", async (req, res) => {
  const { book_id, comment } = req.body;
  const reviewer_id = req.headers["user-id"];

  if (!reviewer_id) {
    return res.status(401).json({ message: "User ID required" });
  }

  if (!comment || comment.trim() === "") {
    return res.status(400).json({ message: "Review comment is required" });
  }

  try {
    const bookCheck = await pgclient.query(
      "SELECT * FROM books WHERE id = $1",
      [book_id],
    );

    if (bookCheck.rows.length === 0) {
      return res.status(404).json({ message: "Book not found" });
    }

    const existingReview = await pgclient.query(
      "SELECT * FROM reviews WHERE book_id = $1 AND reviewer_id = $2",
      [book_id, reviewer_id],
    );

    if (existingReview.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "You already reviewed this book" });
    }

    const borrowCheck = await pgclient.query(
      `SELECT * FROM borrow_requests 
             WHERE book_id = $1 AND requester_id = $2 AND status = 'approved'`,
      [book_id, reviewer_id],
    );

    if (borrowCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "You can only review books you have borrowed" });
    }

    const result = await pgclient.query(
      `INSERT INTO reviews (book_id, reviewer_id, comment)
             VALUES ($1, $2, $3)
             RETURNING *`,
      [book_id, reviewer_id, comment],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//=====DELETE A REVIEW=====
//DELETE /api/reviews/:id
router.delete("/:id", async (req, res) => {
  const reviewId = req.params.id;
  const userId = req.headers["user-id"];
  const role = req.headers["x-role"];

  try {
    const reviewCheck = await pgclient.query(
      "SELECT * FROM reviews WHERE id = $1",
      [reviewId],
    );

    if (reviewCheck.rows.length === 0) {
      return res.status(404).json({ message: "Review not found" });
    }

    const review = reviewCheck.rows[0];

    if (role !== "admin" && review.reviewer_id !== parseInt(userId)) {
      return res
        .status(403)
        .json({ message: "You can only delete your own reviews" });
    }

    const result = await pgclient.query(
      "DELETE FROM reviews WHERE id = $1 RETURNING *",
      [reviewId],
    );

    res.json({ message: "Review deleted", review: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
