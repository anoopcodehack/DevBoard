const mongoose = require("mongoose");

const snippetSchema = new mongoose.Schema({
  language: { type: String, default: "javascript" },
  code: { type: String, required: true },
});

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["backlog", "inprogress", "review", "done"],
      default: "backlog",
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
    dueDate: { type: Date },
    pomodoroCount: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
  },
  { timestamps: true }
);

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
