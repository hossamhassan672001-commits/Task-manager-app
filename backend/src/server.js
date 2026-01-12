import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { query, healthcheck } from "./db.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET || "dev_secret";

app.use(cors({
  origin: process.env.CORS_ORIGIN || "*"
}));
app.use(express.json({ limit: "1mb" }));

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    jwtSecret,
    { expiresIn: "7d" }
  );
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing auth token" });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = { id: payload.sub, email: payload.email, name: payload.name };
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid auth token" });
  }
}

app.get("/api/health", async (req, res) => {
  try {
    await healthcheck();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Database unavailable" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required" });
  }

  try {
    const existing = await query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [name.trim(), email.trim().toLowerCase(), passwordHash]
    );

    const user = { id: result.insertId, name: name.trim(), email: email.trim().toLowerCase() };
    const token = signToken(user);
    return res.status(201).json({ user, token });
  } catch (error) {
    return res.status(500).json({ message: "Failed to register" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const users = await query(
      "SELECT id, name, email, password_hash FROM users WHERE email = ?",
      [email.trim().toLowerCase()]
    );
    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = users[0];
    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken(user);
    return res.json({
      user: { id: user.id, name: user.name, email: user.email },
      token
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to login" });
  }
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  res.json({ user: req.user });
});

app.get("/api/tasks", authMiddleware, async (req, res) => {
  try {
    const tasks = await query(
      "SELECT id, title, description, status, created_at, updated_at FROM tasks WHERE user_id = ? ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ message: "Failed to load tasks" });
  }
});

app.post("/api/tasks", authMiddleware, async (req, res) => {
  const { title, description, status } = req.body || {};

  if (!title || typeof title !== "string") {
    return res.status(400).json({ message: "Title is required" });
  }

  try {
    const result = await query(
      "INSERT INTO tasks (user_id, title, description, status) VALUES (?, ?, ?, ?)",
      [req.user.id, title.trim(), description?.trim() || "", status || "open"]
    );
    const inserted = await query(
      "SELECT id, title, description, status, created_at, updated_at FROM tasks WHERE id = ? AND user_id = ?",
      [result.insertId, req.user.id]
    );
    res.status(201).json({ task: inserted[0] });
  } catch (error) {
    res.status(500).json({ message: "Failed to create task" });
  }
});

app.put("/api/tasks/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { title, description, status } = req.body || {};

  if (!title || typeof title !== "string") {
    return res.status(400).json({ message: "Title is required" });
  }

  try {
    const result = await query(
      "UPDATE tasks SET title = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
      [title.trim(), description?.trim() || "", status || "open", id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    const updated = await query(
      "SELECT id, title, description, status, created_at, updated_at FROM tasks WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    res.json({ task: updated[0] });
  } catch (error) {
    res.status(500).json({ message: "Failed to update task" });
  }
});

app.delete("/api/tasks/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query("DELETE FROM tasks WHERE id = ? AND user_id = ?", [
      id,
      req.user.id
    ]);
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
