import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import bookRoutes from "./routes/books.js";
import borrowRoutes from "./routes/borrow.js";

import pgclient from "./db/db.js";

const app = express();
dotenv.config();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("🚀 ReRead API Server");
});

app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/borrow-requests", borrowRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "🚫 Route not found" });
});

pgclient.connect().then(() => {
  app.listen(PORT, () => {
    console.log(`Listening on PORT ${PORT}`);
  });
});
