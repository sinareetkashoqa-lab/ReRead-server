import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import pgclient from "./db/db.js";

const app = express();
dotenv.config();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const PORT = process.env.PORT || 5000;

//test
app.get("/", (req, res) => {
  res.send("🚀 ReRead API Server");
});

//404
app.use((req, res) => {
  res.status(404).json({ message: "🚫 Route not found" });
});

//connect to database and start server
pgclient.connect().then(() => {
  app.listen(PORT, () => {
    console.log(`Listening on PORT ${PORT}`);
  });
});
