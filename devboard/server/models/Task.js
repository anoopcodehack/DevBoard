const mongoose = require("mongoose");

const snippetSchema = new mongoose.Schema({
  language: { type: String, default: "javascript" },
  code: { type: String, required: true },
});

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["backlog", "inprogress", "review", "done"],
      default: "backlog",
    },
    // Column the task was in before its last status change
    previousStatus: {
      type: String,
      enum: ["backlog", "inprogress", "review", "done", null],
      default: null,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    labelColor: { type: String, default: "" },
    tags: [{ type: String }],
    snippets: [snippetSchema],
    githubIssueUrl: { type: String, default: "" },
    githubIssueNumber: { type: Number },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assigneeHistory: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        assignedAt: { type: Date, default: Date.now },
      },
    ],
    dueDate: { type: Date },
    pomodoroCount: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    estimate: { type: String, default: '' },
    reactions: [{
      emoji: String,
      count: { type: Number, default: 1 },
      users: [{ type: mongoose.Schema.Types.ObjectId,
      ref: 'User' }]
    }],
    seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    activity: [
      {
        action: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
  {
  blockedBy: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
    default: [],
  },
],}
);

// GET /api/tasks returns every task sorted by order; without an index MongoDB
// sorts the whole collection in memory on each board load.
taskSchema.index({ order: 1 });

// Normalize tags at the API boundary: trim whitespace, drop empties, dedupe.
// Tags arrive from the modal, GitHub import, and AI suggestions — whitespace
// differences must not create distinct tags (e.g. "react " vs "react").
const sanitizeTags = (tags) => {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((t) => typeof t === "string")
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .filter((t, i, arr) => arr.indexOf(t) === i);
};

module.exports = mongoose.model("Task", taskSchema);
module.exports.sanitizeTags = sanitizeTags;
