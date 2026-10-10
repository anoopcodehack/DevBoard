import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "react-toastify";
import { useBoard } from "../../context/BoardContext";
import { timeAgo } from "../../utils/timeAgo";
import { QRCodeSVG } from "qrcode.react";
import {
  SparklesIcon,
  DownloadIcon,
  CodeIcon,
  CopyIcon,
  QrCodeIcon,
  ExternalLinkIcon,
  PinIcon,
  XIcon,
  CheckIcon,
} from "../common/Icons";

const TITLE_MAX_LENGTH = 100;
// The tags field holds the whole comma separated list, not one tag, so its
// budget has to be sized for a list. The placeholder alone is 39 characters.
// Other paths into the same field are not bound by it at all: the suggested
// tags on the card write through updateTask and the GitHub import writes on
// the server, and neither goes through this input.
const TAGS_MAX_LENGTH = 120;
// The AI generator asks Gemini for "2-3 sentences", which lands around 150 to
// 400 characters. A budget has to hold that plus a note typed afterwards,
// otherwise the field cuts off the text the button just produced.
const DESCRIPTION_MAX_LENGTH = 500;
// Where the counter starts warning. Kept as fractions so both follow the
// budget above instead of drifting when it changes.
const DESCRIPTION_WARN_AT = Math.round(DESCRIPTION_MAX_LENGTH * 0.8);
const DESCRIPTION_ALERT_AT = Math.round(DESCRIPTION_MAX_LENGTH * 0.92);
const COPY_SUFFIX = " (copy)";
const PRIORITY_BY_SHORTCUT = {
  "1": "high",
  "2": "medium",
  "3": "low",
};

const COLORS = [
  "#7F77DD",
  "#E85D75",
  "#27AE60",
  "#F39C12",
  "#2980B9",
  "#E74C3C",
  "",
];
const EMOJIS = ["👍", "🔥", "😅", "💀", "✅"];

const TaskModal = ({
  task,
  mode = "create",
  defaultStatus = "backlog",
  onClose,
  onSave,
  updateTask,
}) => {
  const initialForm = {
    title: task?.title || "",
    description: task?.description || "",
    status: task?.status || defaultStatus,
    priority: task?.priority || "medium",
    labelColor: task?.labelColor || "",
    tags: task?.tags?.join(", ") || "",
    githubIssueUrl: task?.githubIssueUrl || "",
    githubIssueNumber: task?.githubIssueNumber || "",
    dueDate: task?.dueDate || "",
    notes: task?.notes || "",
   blockedBy: Array.isArray(task?.blockedBy) ? task.blockedBy .map((item) => typeof item === "object" && item !== null ? String(item._id ?? item.id ?? "") : String(item), ) .filter(Boolean) : [],
  };

  const [form, setForm] = useState(initialForm);
  const [confirmClose, setConfirmClose] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const taskShareUrl = task ? `${window.location.origin}/task/${task._id}` : "";
  const { deleteTask, addTask, allTasks } = useBoard();
  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);
  const isDuplicate = allTasks.some(
    (t) =>
      t.title?.toLowerCase().trim() === form.title.toLowerCase().trim() &&
      t._id !== task?._id,
  );
  // Both counters were computed inline before, the word count twice in a row:
  // once for the number and once for the plural of "word".
  const descriptionLength = form.description.length;
  const descriptionWords = form.description
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  // Tags are stored the way they were typed, so the list keeps the first
  // spelling it sees and matches case insensitively: typing "rea" should still
  // find an existing "React" rather than nothing.
  const existingTags = useMemo(() => {
    const firstSpelling = new Map();
    (allTasks || []).forEach((t) => {
      (t.tags || []).forEach((tag) => {
        const key = tag.toLowerCase();
        if (!firstSpelling.has(key)) firstSpelling.set(key, tag);
      });
    });
    return [...firstSpelling.values()];
  }, [allTasks]);

  const tagSegments = form.tags.split(",");
  const typedTag = tagSegments[tagSegments.length - 1].trim().toLowerCase();
  const chosenTags = new Set(
    tagSegments
      .slice(0, -1)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean),
  );
  const tagSuggestions = typedTag
    ? existingTags
        .filter((tag) => {
          const key = tag.toLowerCase();
          return (
            key.includes(typedTag) && key !== typedTag && !chosenTags.has(key)
          );
        })
        .slice(0, 6)
    : [];

  const applyTagSuggestion = (tag) => {
    const segments = form.tags.split(",").map((t) => t.trim());
    segments[segments.length - 1] = tag;
    setForm({ ...form, tags: `${segments.filter(Boolean).join(", ")}, ` });
  };

  const [snippetCode, setSnippetCode] = useState("");
  const [snippetLang, setSnippetLang] = useState("javascript");
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saved, setSaved] = useState(false);

  // AI Loading & Error States
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const [duplicating, setDuplicating] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const handleClose = useCallback(() => {
    if (isDirty) {
      setConfirmClose(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleClose]);

  useEffect(() => {
    const handlePriorityShortcut = (event) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest("input, textarea, select"))
      ) {
        return;
      }

      if (
        event.repeat ||
        event.isComposing ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return;
      }

      const priority = PRIORITY_BY_SHORTCUT[event.key];
      if (!priority) return;

      setForm((current) => ({ ...current, priority }));
    };

    window.addEventListener("keydown", handlePriorityShortcut);
    return () => window.removeEventListener("keydown", handlePriorityShortcut);
  }, []);

  const handleGenerateAI = async () => {
    if (!form.title.trim()) {
      setAiError("Please enter a task title first.");
      return;
    }

    setIsGenerating(true);
    setAiError("");

    try {
      const res = await fetch("/api/v1/ai/generate-description", {
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

  // Copying snippets one by one gets tedious once a task carries a few of
  // them. The header keeps each block apart so the result stays readable
  // after pasting.
  const handleCopyAllSnippets = async () => {
    const snippets = task?.snippets || [];
    const allCode = snippets
      .map((s, i) => `// Snippet ${i + 1} (${s.language})\n${s.code}`)
      .join("\n\n---\n\n");

    try {
      await navigator.clipboard.writeText(allCode);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
      toast.success(`${snippets.length} snippets copied to clipboard`);
    } catch {
      // The clipboard is refused without a secure context or permission.
      // Saying "Copied all!" then would be a lie.
      toast.error("Could not copy the snippets");
    }
  };

  const handleExportJSON = () => {
    const data = JSON.stringify(
      {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        tags: task.tags,
        snippets: task.snippets,
        createdAt: task.createdAt,
      },
      null,
      2,
    );
    navigator.clipboard.writeText(data);
    toast.success("Task JSON copied to clipboard");
  };

  const handleExportMD = () => {
    const md = `# ${task.title}

**Status:** ${task.status}
**Priority:** ${task.priority}
**Tags:** ${task.tags?.join(", ") || "none"}
**Created:** ${task.createdAt ? new Date(task.createdAt).toLocaleDateString() : "unknown"}

## Description
${task.description || "No description"}

${
  task.snippets?.length > 0
    ? `## Code Snippets
${task.snippets
  .map((s) => `\`\`\`${s.language || ""}\n${s.code}\n\`\`\``)
  .join("\n\n")}`
    : ""
}
`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(task.title || "task").replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Task exported as Markdown");
  };

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePop = () => {
      if (isDirty) {
        setConfirmClose(true);
      } else {
        onClose();
      }
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [isDirty, onClose]);

  const buildPayload = () => ({
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
      blockedBy: Array.isArray(form.blockedBy)
  ? form.blockedBy
  : [],
  });

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setLoading(true);
    await onSave(buildPayload());
    setLoading(false);
    onClose();
  };

  // The copy carries over everything the modal shows, snippets included —
  // those are usually the reason for duplicating in the first place. The
  // GitHub link is deliberately left behind: it points at one specific issue
  // and would be wrong on a second card. Status stays as it is so the copy
  // shows up next to the original instead of silently landing in Backlog.
  const handleDuplicate = async () => {
    const base = form.title.trim();
    if (!base) return;
    const room = TITLE_MAX_LENGTH - COPY_SUFFIX.length;
    const title =
      (base.length > room ? base.slice(0, room).trim() : base) + COPY_SUFFIX;

    setDuplicating(true);
    try {
      const { githubIssueUrl, githubIssueNumber, ...payload } = buildPayload();
      payload.blockedBy = [];
      await addTask({
        ...payload,
        title,
        // Drop the subdocument _ids so the copy gets its own snippets.
        snippets: [
          ...(task.snippets || []).map(({ language, code }) => ({
            language,
            code,
          })),
          ...(payload.snippets || []),
        ],
      });
      toast.success("Task duplicated");
      onClose();
    } catch {
      toast.error("Could not duplicate task");
    } finally {
      setDuplicating(false);
    }
  };

  const handleSaveTemplate = () => {
    const templates = JSON.parse(
      localStorage.getItem("task_templates") || "[]",
    );
    const newTemplate = {
      id: Date.now(),
      name: form.title,
      title: form.title,
      description: form.description,
      priority: form.priority,
      tags: form.tags,
    };
    localStorage.setItem(
      "task_templates",
      JSON.stringify([...templates, newTemplate]),
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  const handleReact = async (emoji) => {
    if (!task) {
      toast.error("No task to react to");
      return;
    }
    try {
      // TODO: sending a request to the server to update the reactions
      // Example: await updateTask(task._id, { emoji });
      console.log("React to", emoji);
    } catch (err) {
      console.error("Failed to react", err);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-[#121319] border border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-[#0f1016]">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-zinc-100 text-sm font-mono-code">
              {mode === "create" ? "New Task" : "Edit Task"}
            </h2>
            {task?._id && (
              <span className="text-[10px] font-mono-code text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
                #{String(task._id).slice(-4)}
              </span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="text-zinc-500 hover:text-zinc-300 transition"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
          <input
            autoFocus
            type="text"
            placeholder="Task title *"
            maxLength={TITLE_MAX_LENGTH}
            value={form.title}
            onChange={(e) => {
              setForm({ ...form, title: e.target.value });
              if (aiError) setAiError("");
            }}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
          />
          <div className="text-xs text-[var(--text-muted)] text-right -mt-2">
            {form.title.length}/{TITLE_MAX_LENGTH}
          </div>
          {isDuplicate && (
            <p className="text-xs text-red-400 -mt-2">
              A task with this title already exists!
            </p>
          )}

          {/* Description Section with ✨ AI Button */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-[var(--text-secondary)]">
                Description
              </label>
              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={isGenerating || !form.title.trim()}
                className="text-[11px] font-mono-code font-medium text-blue-400 hover:text-blue-300 disabled:opacity-40 transition flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 px-2.5 py-1 rounded-md"
              >
                <SparklesIcon className="w-3 h-3 text-blue-400" />
                <span>{isGenerating ? "Generating..." : "Generate AI Description"}</span>
              </button>
            </div>

            <textarea
              placeholder="Description (optional) or generate with AI..."
              maxLength={DESCRIPTION_MAX_LENGTH}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={3}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] resize-none"
            />

            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-[var(--text-secondary)]">
                {descriptionWords} word{descriptionWords !== 1 ? "s" : ""}
              </p>
              <p
                className={`text-[10px] transition-colors ${
                  descriptionLength >= DESCRIPTION_ALERT_AT
                    ? "text-red-400 font-medium"
                    : descriptionLength >= DESCRIPTION_WARN_AT
                      ? "text-yellow-400"
                      : "text-[var(--text-muted)]"
                }`}
              >
                {descriptionLength}/{DESCRIPTION_MAX_LENGTH}
                {descriptionLength >= DESCRIPTION_ALERT_AT && " almost full"}
              </p>
            </div>

            {aiError && <p className="text-xs text-red-400 mt-1">{aiError}</p>}
          </div>

          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">
              Private Notes
            </label>
            <textarea
              placeholder="Private notes (only visible to you)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full bg-[var(--bg-primary)] border border-dashed border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] resize-none"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="backlog">Backlog</option>
              <option value="inprogress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>

            <div className="flex-1">
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                Press 1/2/3 to set priority quickly
              </p>
            </div>
          </div>

          
<div className="space-y-2">
  <div className="flex items-center justify-between gap-2">
    <label
      htmlFor="blockedBy"
      className="text-xs font-medium text-[var(--text-secondary)]"
    >
      Blocked by
    </label>

    <span className="text-[10px] font-mono-code text-[var(--text-muted)]">
      {(form.blockedBy || []).length} selected
    </span>
  </div>

  <div
    id="blockedBy"
    className="overflow-hidden rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)]"
  >
    <div className="max-h-40 overflow-y-auto p-1.5">
      {allTasks.filter(
        (item) =>
          String(item._id) !== String(task?._id)
      ).length === 0 ? (
        <p className="px-3 py-4 text-center text-xs text-[var(--text-muted)]">
          No other tasks available
        </p>
      ) : (
        allTasks
          .filter(
            (item) =>
              String(item._id) !== String(task?._id)
          )
          .map((item) => {
            const id = String(item._id);
            const selected = (form.blockedBy || []).includes(id);

            return (
              <label
                key={id}
                className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 transition ${
                  selected
                    ? "bg-rose-500/10"
                    : "hover:bg-[var(--bg-card)]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(event) => {
                    setForm((prev) => {
                      const current = prev.blockedBy || [];

                      return {
                        ...prev,
                        blockedBy: event.target.checked
                          ? [...current, id]
                          : current.filter((value) => value !== id),
                      };
                    });
                  }}
                  className="h-3.5 w-3.5 shrink-0 accent-rose-500"
                />

                <span className="min-w-0 flex-1 truncate text-xs text-[var(--text-primary)]">
                  {item.title}
                </span>

                <span className="shrink-0 rounded border border-[var(--border-primary)] px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-[var(--text-muted)]">
                  {String(item.status || "backlog").replace(
                    /inprogress|in_progress/i,
                    "In Progress"
                  ).replace(/^backlog$/i, "Backlog").replace(/^review$/i, "Review").replace(/^done$/i, "Done")}
                </span>
              </label>
            );
          })
      )}
    </div>
  </div>

  <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">
    Select tasks that must be completed first. Uncheck a task to remove its dependency.
  </p>
</div>

          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">
              Label color
            </label>
            <div className="flex items-center gap-2">
              {COLORS.map((color) => (
                <button
                  key={color || "none"}
                  type="button"
                  title={color || "No color"}
                  onClick={() => setForm({ ...form, labelColor: color })}
                  style={{ background: color || "transparent" }}
                  className={`w-5 h-5 rounded-full border-2 ${
                    form.labelColor === color ? "border-white" : "border-[#444]"
                  }`}
                />
              ))}
            </div>
          </div>

          <input
            type="text"
            maxLength={TAGS_MAX_LENGTH}
            placeholder="Tags (comma separated: react, api, bug)"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
          />

          {tagSuggestions.length > 0 && (
            <div className="flex gap-1 flex-wrap -mt-1">
              {tagSuggestions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => applyTagSuggestion(tag)}
                  title={`Use the existing tag ${tag}`}
                  className="text-[10px] px-2 py-0.5 bg-[var(--bg-muted)] text-[var(--text-secondary)] rounded-full hover:text-[var(--accent)] transition"
                >
                  + {tag}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="GitHub Issue URL"
              value={form.githubIssueUrl}
              onChange={(e) =>
                setForm({ ...form, githubIssueUrl: e.target.value })
              }
              className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
            />
            <input
              type="number"
              placeholder="#"
              value={form.githubIssueNumber}
              onChange={(e) =>
                setForm({ ...form, githubIssueNumber: e.target.value })
              }
              className="w-16 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Existing Snippets */}
          {task?.snippets?.length > 1 && (
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={handleCopyAllSnippets}
                title="Copy every snippet of this task at once"
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] transition outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
              >
                {copiedAll ? "✅ Copied all!" : "📋 Copy all snippets"}
              </button>
            </div>
          )}
          {task?.snippets?.map((snippet, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-[var(--bg-primary)] rounded-lg px-3 py-2 mb-2"
            >
              <span className="text-xs font-mono text-[var(--text-secondary)]">
                {snippet.language} snippet
              </span>
              <button
                onClick={() => handleDeleteSnippet(index)}
                className="text-red-400 hover:text-red-300 text-xs"
              >
                ✕ Remove
              </button>
            </div>
          ))}

          {/* Activity Log */}
          {task?.activity?.length > 0 && (
            <div className="border border-[var(--border-primary)] rounded-lg px-3 py-2">
              <span className="text-xs text-[var(--text-secondary)] block mb-1.5">
                📜 Recent activity
              </span>
              <ul className="flex flex-col gap-1">
                {task.activity
                  .slice(-3)
                  .reverse()
                  .map((a, i) => (
                    <li
                      key={i}
                      className="text-xs text-[var(--text-muted)] flex justify-between"
                    >
                      <span>{a.action}</span>
                      <span className="text-[var(--text-secondary)]">
                        {timeAgo(a.timestamp)}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Assignee History */}
          {task?.assigneeHistory?.length > 0 && (
            <div className="border border-[var(--border-primary)] rounded-lg px-3 py-2">
              <span className="text-xs text-[var(--text-secondary)] block mb-1.5">
                👥 Previously: {task.assigneeHistory.length} assignee{task.assigneeHistory.length === 1 ? "" : "s"}
              </span>
              <ul className="flex flex-col gap-1">
                {task.assigneeHistory
                  .slice(-3)
                  .reverse()
                  .map((h, i) => (
                    <li
                      key={i}
                      className="text-xs text-[var(--text-muted)] flex justify-between"
                    >
                      <span>{h.user?.name || "Previous assignee"}</span>
                      {h.assignedAt && (
                        <span className="text-[var(--text-secondary)]">
                          {timeAgo(h.assignedAt)}
                        </span>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Title History */}
          {task?.titleHistory?.length > 0 && (
            <div className="border border-[var(--border-primary)] rounded-lg px-3 py-2">
              <span className="text-xs text-[var(--text-secondary)] block mb-1.5">
                ✏️ Previous title{task.titleHistory.length === 1 ? "" : "s"}
              </span>
              <ul className="flex flex-col gap-1">
                {task.titleHistory
                  .slice(-5)
                  .reverse()
                  .map((h, i) => (
                    <li
                      key={i}
                      className="text-xs text-[var(--text-muted)] flex justify-between gap-3"
                    >
                      <span className="truncate" title={h.title}>{h.title}</span>
                      {h.changedAt && (
                        <span className="text-[var(--text-secondary)] shrink-0">
                          {timeAgo(h.changedAt)}
                        </span>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          )}


          {/* Add Code Snippet */}
          <div className="border border-[var(--border-primary)] rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-primary)] border-b border-[var(--border-primary)]">
              <span className="text-xs text-[var(--text-secondary)]">
                {"</>"} Code Snippet
              </span>
              <select
                value={snippetLang}
                onChange={(e) => setSnippetLang(e.target.value)}
                className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded text-xs text-[var(--text-secondary)] px-2 py-1 focus:outline-none"
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
              className="w-full bg-[var(--bg-primary)] px-3 py-2 text-xs font-mono text-[var(--text-muted)] placeholder-[var(--text-muted)] focus:outline-none resize-none"
            />
          </div>
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          />

          <select
            value={form.estimate || ""}
            onChange={(e) => setForm({ ...form, estimate: e.target.value })}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="">No estimate</option>
            <option value="30m">30 minutes</option>
            <option value="1h">1 hour</option>
            <option value="2h">2 hours</option>
            <option value="4h">4 hours</option>
            <option value="1d">1 day</option>
          </select>
          <div className="flex items-center gap-1 border-t border-[var(--border-primary)] pt-3 mt-2">
            <span className="text-xs text-[var(--text-secondary)] mr-1">
              Reactions:
            </span>
            {EMOJIS.map((emoji) => {
              const reaction = task?.reactions?.find((r) => r.emoji === emoji);
              return (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className="text-xs px-2 py-1 rounded-full bg-[#2a2a2f] hover:bg-[#333] transition"
                >
                  {emoji} {reaction?.count || ""}
                </button>
              );
            })}
          </div>
          {task && showQR && (
            <div className="flex flex-col items-center gap-2 rounded-lg bg-white p-4">
              <QRCodeSVG value={taskShareUrl} size={160} />
              <p className="text-xs text-gray-700">Scan to open task</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-t border-zinc-800 bg-[#0f1016]">
          <div className="flex items-center gap-1">
            {task && (
              <button
                type="button"
                onClick={handleExportJSON}
                title="Export as JSON"
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
              >
                <DownloadIcon className="w-3.5 h-3.5" />
              </button>
            )}
            {task && (
              <button
                type="button"
                onClick={handleExportMD}
                title="Export as Markdown"
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
              >
                <CodeIcon className="w-3.5 h-3.5" />
              </button>
            )}
            {task && (
              <button
                onClick={handleDuplicate}
                disabled={duplicating || !form.title.trim()}
                title="Duplicate task"
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition disabled:opacity-40"
              >
                <CopyIcon className="w-3.5 h-3.5" />
              </button>
            )}
            {task && (
              <button
                type="button"
                onClick={() => setShowQR((value) => !value)}
                title={showQR ? "Hide QR code" : "Show QR code"}
                className={`p-1.5 rounded-lg transition ${showQR ? "bg-zinc-800 text-blue-400" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"}`}
              >
                <QrCodeIcon className="w-3.5 h-3.5" />
              </button>
            )}
            {task && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/task/${task._id}`,
                  );
                  toast.success("Share link copied to clipboard");
                }}
                title="Copy share link"
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
              >
                <ExternalLinkIcon className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={!form.title.trim()}
              title={saved ? "Saved template!" : "Save as reusable template"}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition disabled:opacity-40"
            >
              {saved ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <PinIcon className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center flex-wrap justify-end gap-2">
            <button
              onClick={handleClose}
              className="shrink-0 whitespace-nowrap px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition font-mono-code"
            >
              Cancel
            </button>
            {confirmDelete ? (
              <div className="shrink-0 flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-lg px-2.5 py-1">
                <span className="text-xs text-zinc-400 whitespace-nowrap font-mono-code">
                  Delete task?
                </span>
                <button
                  onClick={async () => {
                    await deleteTask(task._id);
                    onClose();
                  }}
                  className="text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 px-2 py-0.5 rounded transition whitespace-nowrap font-mono-code"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-200 px-1 py-0.5 rounded transition whitespace-nowrap font-mono-code"
                >
                  Cancel
                </button>
              </div>
            ) : (
              mode === "edit" && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="shrink-0 whitespace-nowrap px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 transition font-mono-code"
                >
                  Delete
                </button>
              )
            )}
            <button
              onClick={handleSave}
              disabled={loading || !form.title.trim() || isDuplicate}
              className="shrink-0 whitespace-nowrap px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-40 shadow-sm shadow-blue-500/20 font-mono-code"
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

      {confirmClose && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-6 max-w-sm shadow-2xl">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Unsaved Changes
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              You have unsaved changes. Are you sure you want to discard them?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmClose(false)}
                className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
              >
                Keep Editing
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskModal;
