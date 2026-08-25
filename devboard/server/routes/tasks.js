const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const { protect } = require("../middleware/auth");

// GET /api/tasks — get all tasks
router.get("/", protect, async (req, res) => {
  try {
    const tasks = await Task.find().populate("assignee", "name email avatar").sort("order");
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/tasks — create task
router.post("/", protect, async (req, res) => {
  try {
    const task = await Task.create({
      ...req.body,
      tags: Task.sanitizeTags(req.body.tags),
    });
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/tasks/:id — update task (status, content, etc.)
router.put("/:id", protect, async (req, res) => {
  try {
    // Only touch tags when the caller sends them — partial updates like
    // { pomodoroCount } or { status, order } must not wipe existing tags.
    const updates = { ...req.body };
    if (req.body.tags !== undefined) {
      updates.tags = Task.sanitizeTags(req.body.tags);
    }
    const updatedTask = await Task.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    }).populate("assignee", "name email avatar");
    if (!updatedTask) return res.status(404).json({ message: "Task not found" });

    // Broadcast so other open boards update without refresh
    const io = req.app.get("io");
    if (io) io.emit("task:updated", updatedTask);

    res.json(updatedTask);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/tasks/:id — delete task
router.delete("/:id", protect, async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/tasks/:id/snippets — add code snippet to task
router.post("/:id/snippets", protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    task.snippets.push(req.body);
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/tasks/:id/pomodoro — increment pomodoro count
router.patch("/:id/pomodoro", protect, async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $inc: { pomodoroCount: 1 } },
      { new: true }
    );
    res.json(task);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
