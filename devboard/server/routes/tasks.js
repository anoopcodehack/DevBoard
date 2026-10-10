const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const { protect } = require("../middleware/auth");

// GET /api/tasks — get all tasks
router.get("/", protect, async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate("assignee", "name email avatar")
      .populate("assigneeHistory.user", "name email avatar")
      .sort("order");
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/tasks/:id — get one task and record the viewer once
router.get("/:id", protect, async (req, res) => {
  try {
    let task = await Task.findOneAndUpdate(
      { _id: req.params.id, seenBy: { $ne: req.user._id } },
      { $addToSet: { seenBy: req.user._id } },
      { new: true, timestamps: false },
    );
    const viewerWasAdded = Boolean(task);

    if (!task) task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    await task.populate("assignee", "name email avatar");
    await task.populate("assigneeHistory.user", "name email avatar");

    const io = req.app.get("io");
    if (viewerWasAdded && io) io.emit("task:updated", task);

    res.json(task);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/tasks — create task
router.post("/", protect, async (req, res) => {
  try {
    const taskData = { ...req.body };
    delete taskData.seenBy;
    const task = await Task.create({
      ...taskData,
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
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Track assignee history if assignee changes
    if (
      req.body.assignee &&
      task.assignee &&
      req.body.assignee !== task.assignee.toString()
    ) {
      if (!task.assigneeHistory) {
        task.assigneeHistory = [];
      }
      task.assigneeHistory.push({
        user: task.assignee,
        assignedAt: new Date(),
      });
    }

    const statusChanged = req.body.status && req.body.status !== task.status;
    const previousStatus = task.status;
    if (statusChanged) {
      task.activity.push({
        action: `status changed to ${req.body.status}`,
      });
    }

    const updates = { ...req.body };
    delete updates.seenBy;
    delete updates.previousStatus;
    Object.assign(task, updates);
    if (statusChanged) task.previousStatus = previousStatus;
    if (req.body.tags !== undefined) {
      task.tags = Task.sanitizeTags(req.body.tags);
    }

    await task.save();
    await task.populate("assignee", "name email avatar");
    await task.populate("assigneeHistory.user", "name email avatar");

    // Broadcast so other open boards update without refresh
    const io = req.app.get("io");
    if (io) io.emit("task:updated", task);

    res.json(task);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});



// DELETE /api/tasks/:id — delete task
router.delete("/:id", protect, async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    // A deleted task can't block anything anymore
    await Task.updateMany(
      { blockedBy: task._id },
      { $pull: { blockedBy: task._id } },
    );
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
      { new: true },
    );
    res.json(task);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
