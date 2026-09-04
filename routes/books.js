import express from "express";
import pgclient from "../db/db.js";

const router = express.Router();

//=====BOOKS CRUD=====

//GET all books
router.get("/", async (req, res) => {
    try {
        const result = await pgclient.query(`
            SELECT 
                b.*,
                u.username as owner_name,
                u.location
            FROM books b
            JOIN users u ON b.user_id = u.id
            WHERE b.is_available = true
            ORDER BY b.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

//GET user's own books
router.get("/my-books", async (req, res) => {
    const userId = req.headers["user-id"];

    if (!userId) {
        return res.status(401).json({ message: "User ID required" });
    }

    try {
        const result = await pgclient.query(
            "SELECT * FROM books WHERE user_id = $1 ORDER BY created_at DESC",
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

//GET one book by id
router.get("/:id", async (req, res) => {
    const id = req.params.id;

    try {
        const result = await pgclient.query(`
            SELECT 
                b.*,
                u.username as owner_name,
                u.location,
                u.full_name as owner_full_name
            FROM books b
            JOIN users u ON b.user_id = u.id
            WHERE b.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Book not found" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

//POST create a new book
router.post("/", async (req, res) => {
    const { 
        title, 
        author, 
        genre, 
        isbn, 
        description, 
        condition, 
        cover_image_url, 
        owner_notes 
    } = req.body;
    
    const userId = req.headers["user-id"];

    if (!userId) {
        return res.status(401).json({ message: "User ID required" });
    }

    try {
        const result = await pgclient.query(
            `INSERT INTO books 
             (user_id, title, author, genre, isbn, description, condition, cover_image_url, owner_notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [userId, title, author, genre, isbn, description, condition, cover_image_url, owner_notes]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

//PUT update a book
router.put("/:id", async (req, res) => {
    const id = req.params.id;
    const { condition, owner_notes } = req.body;
    const userId = req.headers["user-id"];

    try {
        const bookCheck = await pgclient.query(
            "SELECT * FROM books WHERE id = $1",
            [id]
        );

        if (bookCheck.rows.length === 0) {
            return res.status(404).json({ message: "Book not found" });
        }

        if (bookCheck.rows[0].user_id !== parseInt(userId)) {
            return res.status(403).json({ message: "You can only edit your own books" });
        }

        const result = await pgclient.query(
            `UPDATE books 
             SET condition = $1, owner_notes = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING *`,
            [condition, owner_notes, id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

//DELETE a book
router.delete("/:id", async (req, res) => {
    const id = req.params.id;
    const userId = req.headers["user-id"];
    const role = req.headers["x-role"];

    try {
        const bookCheck = await pgclient.query(
            "SELECT * FROM books WHERE id = $1",
            [id]
        );

        if (bookCheck.rows.length === 0) {
            return res.status(404).json({ message: "Book not found" });
        }

        if (role !== "admin" && bookCheck.rows[0].user_id !== parseInt(userId)) {
            return res.status(403).json({ message: "You can only delete your own books" });
        }

        const result = await pgclient.query(
            "DELETE FROM books WHERE id = $1 RETURNING *",
            [id]
        );

        res.json({ message: "Book deleted", book: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

//=====GOOGLE BOOKS API=====

//GET search books from Google Books API
router.get("/search", async (req, res) => {
    const { q } = req.query;

    if (!q || q.length < 2) {
        return res.status(400).json({ message: "Search query required (minimum 2 characters)" });
    }

    try {
        const response = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10`
        );
        const data = await response.json();

        if (!data.items) {
            return res.json([]);
        }

        const results = data.items.map((item) => {
            const volume = item.volumeInfo;
            return {
                title: volume.title || "",
                author: volume.authors ? volume.authors[0] : "",
                genre: volume.categories ? volume.categories[0] : "",
                description: volume.description || "",
                coverImage: volume.imageLinks?.thumbnail || "",
                isbn: volume.industryIdentifiers?.[0]?.identifier || "",
            };
        });

        res.json(results);
    } catch (error) {
        console.error("Google Books API error:", error);
        res.status(500).json({ error: "Failed to search books" });
    }
});

//GET fetch book by ISBN from Google Books API
router.get("/fetch-isbn/:isbn", async (req, res) => {
    const { isbn } = req.params;

    if (!isbn) {
        return res.status(400).json({ message: "ISBN required" });
    }

    try {
        const response = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`
        );
        const data = await response.json();

        if (!data.items || data.items.length === 0) {
            return res.status(404).json({ message: "Book not found on Google Books" });
        }

        const volume = data.items[0].volumeInfo;
        const result = {
            title: volume.title || "",
            author: volume.authors ? volume.authors[0] : "",
            genre: volume.categories ? volume.categories[0] : "",
            description: volume.description || "",
            coverImage: volume.imageLinks?.thumbnail || "",
            isbn: isbn,
        };

        res.json(result);
    } catch (error) {
        console.error("Google Books API error:", error);
        res.status(500).json({ error: "Failed to fetch book" });
    }
});

export default router;