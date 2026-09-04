import express from "express";
import pgclient from "../db/db.js";

const router = express.Router();

//register
router.post("/register", async (req, res) => {
  const { username, email, password, fullName, location } = req.body;

  try {
    //check if user exists
    const existingUser = await pgclient.query(
      "SELECT * FROM users WHERE email = $1 OR username = $2",
      [email, username],
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    //create user
    const result = await pgclient.query(
      `INSERT INTO users (username, email, password, full_name, location)
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, username, email, full_name, location, role`,
      [username, email, password, fullName, location],
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pgclient.query(
      "SELECT * FROM users WHERE email = $1 AND password = $2",
      [email, password],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        location: user.location,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
