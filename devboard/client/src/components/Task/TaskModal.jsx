import React, { useState } from "react";
import { useBoard } from "../../context/BoardContext";

const TaskModal = ({
  task,
  mode = "create",
  defaultStatus = "backlog",
  onClose,
  onSave,
  updateTask,
}) => {
  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    status: task?.status || defaultStatus,
    priority: task?.priority || "medium",
    tags: task?.tags?.join(", ") || "",
    githubIssueUrl: task?.githubIssueUrl || "",
    githubIssueNumber: task?.githubIssueNumber || "",
    dueDate: task?.dueDate || "",
  });
  const [descCount, setDescCount] = useState(task?.description?.length || 0);
  const [snippetCode, setSnippetCode] = useState("");
  const [snippetLang, setSnippetLang] = useState("javascript");
  const [loading, setLoading] = useState(false);

  // AI Loading & Error States
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const { deleteTask } = useBoard();

  const handleGenerateAI = async () => {
    if (!form.title.trim()) {
      setAiError("Please enter a task title first.");
      return;
    }

    setIsGenerating(true);
    setAiError("");

    try {
      const res = await fetch("/api/ai/generate-description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: form.title }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate description.");
      }

      setForm((prev) => ({
        ...prev,
        description: data.description,
      }));
      setDescCount(data.description ? data.description.length : 0);
    } catch (err) {
      setAiError(err.message || "Error generating AI description.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteSnippet = async (indexToRemove) => {
    const updatedSnippets = task.snippets.filter((_, i) => i !== indexToRemove);
    await updateTask(task._id, { snippets: updatedSnippets });
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setLoading(true);
    const payload = {
      ...form,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      githubIssueNumber: form.githubIssueNumber
        ? Number(form.githubIssueNumber)
        : undefined,
      ...(snippetCode
        ? { snippets: [{ language: snippetLang, code: snippetCode }] }
        : {}),
    };
    await onSave(payload);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)]">
          <h2 className="font-semibold text-[#f0f0f0]">
            {mode === "create" ? "New Task" : "Edit Task"}
          </h2>
          <button
            onClick={onClose}
            className="text-[#666] hover:text-[#aaa] text-xl"
          >
            ✕
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
          <input
            type="text"
            placeholder="Task title *"
            value={form.title}
            onChange={(e) => {
              setForm({ ...form, title: e.target.value });
              if (aiError) setAiError("");
            }}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-purple-500"
          />

          {/* Description Section with ✨ AI Button */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-[#888]">Description</label>
              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={isGenerating || !form.title.trim()}
                className="text-xs font-medium text-purple-400 hover:text-purple-300 disabled:opacity-40 transition flex items-center gap-1 bg-purple-950/40 border border-purple-800/50 hover:border-purple-600 px-2.5 py-1 rounded-md"
              >
                {isGenerating ? "✨ Generating..." : "✨ Generate with AI"}
              </button>
            </div>

            <textarea
              placeholder="Description (optional) or generate with AI..."
              value={form.description}
              onChange={(e) => {
                setForm({ ...form, description: e.target.value });
                setDescCount(e.target.value.length);
              }}
              maxLength={300}
              rows={3}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-purple-500 resize-none"
            />
            <span className="text-[10px] text-[#555] text-right block mt-1">
              {descCount}/300
            </span>

            {aiError && (
              <p className="text-xs text-red-400 mt-1">{aiError}</p>
            )}
          </div>

          <div className="flex gap-2">
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[#f0f0f0] focus:outline-none focus:border-purple-500"
            >
              <option value="backlog">Backlog</option>
              <option value="inprogress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>

            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[#f0f0f0] focus:outline-none focus:border-purple-500"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </div>

          <input
            type="text"
            placeholder="Tags (comma separated: react, api, bug)"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-purple-500"
          />

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="GitHub Issue URL"
              value={form.githubIssueUrl}
              onChange={(e) =>
                setForm({ ...form, githubIssueUrl: e.target.value })
              }
              className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-purple-500"
            />
            <input
              type="number"
              placeholder="#"
              value={form.githubIssueNumber}
              onChange={(e) =>
                setForm({ ...form, githubIssueNumber: e.target.value })
              }
              className="w-16 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Existing Snippets */}
          {task?.snippets?.map((snippet, index) => (
            <div key={index} className="flex items-center justify-between bg-[#0f0f10] rounded-lg px-3 py-2 mb-2">
              <span className="text-xs font-mono text-[#888]">{snippet.language} snippet</span>
              <button
                onClick={() => handleDeleteSnippet(index)}
                className="text-red-400 hover:text-red-300 text-xs"
              >
                ✕ Remove
              </button>
            </div>
          ))}

          {/* Add Code Snippet */}
          <div className="border border-[var(--border-primary)] rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-primary)] border-b border-[var(--border-primary)]">
              <span className="text-xs text-[#888]">{"</>"} Code Snippet</span>
              <select
                value={snippetLang}
                onChange={(e) => setSnippetLang(e.target.value)}
                className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded text-xs text-[#888] px-2 py-1 focus:outline-none"
              >
                {[
                  "javascript",
                  "typescript",
                  "python",
                  "bash",
                  "sql",
                  "json",
                  "css",
                  "html",
                ].map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              placeholder="// paste your code snippet here..."
              value={snippetCode}
              onChange={(e) => setSnippetCode(e.target.value)}
              rows={4}
              className="w-full bg-[var(--bg-primary)] px-3 py-2 text-xs font-mono text-[#a0a0a0] placeholder-[#444] focus:outline-none resize-none"
            />
          </div>
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[#f0f0f0] focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[var(--border-primary)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#888] hover:text-[#aaa] transition"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
            if (window.confirm('Delete this task?')) {
             await deleteTask(task._id)
             onClose()
                }
             }}
            className="px-4 py-2 text-sm text-red-400 hover:text-red-300 transition"
          >
  Delete
</button>
          <button
            onClick={handleSave}
            disabled={loading || !form.title.trim()}
            className="px-5 py-2 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition disabled:opacity-40"
          >
            {loading
              ? "Saving..."
              : mode === "create"
                ? "Create Task"
                : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;