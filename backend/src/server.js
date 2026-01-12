import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { query, healthcheck } from "./db.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors({
  origin: process.env.CORS_ORIGIN || "*"
}));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", async (req, res) => {
  try {
    await healthcheck();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Database unavailable" });
  }
});

app.get("/api/tasks", async (req, res) => {
  try {
    const tasks = await query(
      "SELECT id, title, description, status, created_at, updated_at FROM tasks ORDER BY created_at DESC"
    );
    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ message: "Failed to load tasks" });
  }
});

app.post("/api/tasks", async (req, res) => {
  const { title, description, status } = req.body || {};

  if (!title || typeof title !== "string") {
    return res.status(400).json({ message: "Title is required" });
  }

  try {
    const result = await query(
      "INSERT INTO tasks (title, description, status) VALUES (?, ?, ?)",
      [title.trim(), description?.trim() || "", status || "open"]
    );
    const inserted = await query(
      "SELECT id, title, description, status, created_at, updated_at FROM tasks WHERE id = ?",
      [result.insertId]
    );
    res.status(201).json({ task: inserted[0] });
  } catch (error) {
    res.status(500).json({ message: "Failed to create task" });
  }
});

app.put("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const { title, description, status } = req.body || {};

  if (!title || typeof title !== "string") {
    return res.status(400).json({ message: "Title is required" });
  }

  try {
    const result = await query(
      "UPDATE tasks SET title = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [title.trim(), description?.trim() || "", status || "open", id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    const updated = await query(
      "SELECT id, title, description, status, created_at, updated_at FROM tasks WHERE id = ?",
      [id]
    );
    res.json({ task: updated[0] });
  } catch (error) {
    res.status(500).json({ message: "Failed to update task" });
  }
});

app.delete("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query("DELETE FROM tasks WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Failed to delete task" });
  }
});

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
