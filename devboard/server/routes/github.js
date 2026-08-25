const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Task = require("../models/Task");

// GET /api/github/issues?repo=owner/repo
// Fetches open issues from a GitHub repo and optionally imports them as tasks
router.get("/issues", protect, async (req, res) => {
  const { repo } = req.query;
  if (!repo) return res.status(400).json({ message: "repo query param required (owner/repo)" });

  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/issues?state=open`,
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
    if (!response.ok) throw new Error("GitHub API error");
    const issues = await response.json();
    res.json(
      issues.map((i) => ({
        number: i.number,
        title: i.title,
        url: i.html_url,
        labels: i.labels.map((l) => l.name),
        body: i.body,
      }))
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/github/import — import a GitHub issue as a task
router.post("/import", protect, async (req, res) => {
  const { title, githubIssueUrl, githubIssueNumber, tags } = req.body;
  try {
    const task = await Task.create({
      title,
      githubIssueUrl,
      githubIssueNumber,
      tags: Task.sanitizeTags(tags),
      status: "backlog",
    });
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
