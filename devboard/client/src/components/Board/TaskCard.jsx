import React, { useEffect, useRef, useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useBoard } from "../../context/BoardContext";
import { useSuggestTags } from "../../hooks/useSuggestTags";

const PRIORITY_COLORS = {
  high: "🔴 bg-red-500/20 text-red-400",
  medium: "🟡 bg-yellow-500/20 text-yellow-400",
  low: "🟢 bg-green-500/20 text-green-400",
};

const GLOW = {
  high: "hover:shadow-red-500/20",
  medium: "hover:shadow-yellow-500/20",
  low: "hover:shadow-green-500/20",
};

const TAG_COLORS = [
  "bg-purple-500/20 text-purple-400",
  "bg-blue-500/20 text-blue-400",
  "bg-green-500/20 text-green-400",
  "bg-red-500/20 text-red-400",
  "bg-yellow-500/20 text-yellow-400",
  "bg-pink-500/20 text-pink-400",
];

const getTagColor = (tag) =>
  TAG_COLORS[tag.charCodeAt(0) % TAG_COLORS.length];

const AVATAR_COLORS = [
  "bg-purple-700",
  "bg-blue-600",
  "bg-green-600",
  "bg-rose-600",
  "bg-amber-600",
  "bg-teal-600",
];

// Sum every character so that names sharing a first letter still differ.
const getAvatarColor = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

// Search terms are raw user input, so they have to be escaped before they can
// be used as a pattern — searching for "(" would otherwise throw.
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Wrap every occurrence of the active search term in a <mark> so it is visible
// on the card itself why it survived the filter.
const highlightMatch = (text, query) => {
  const term = query?.trim();
  if (!term || !text) return text;

  const parts = String(text).split(new RegExp(`(${escapeRegExp(term)})`, "gi"));

  return parts.map((part, i) =>
    part.toLowerCase() === term.toLowerCase() ? (
      <mark
        key={i}
        className="bg-purple-500/30 text-purple-300 rounded px-0.5"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
};

const estimateToPomodoros = (estimate) => {
  const map = {
    "30m": 1,
    "1h": 2,
    "2h": 4,
    "4h": 8,
    "1d": 16,
  };

  return map[estimate] || null;
};

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date);
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const TaskCard = ({
  task,
  index,
  onSelect,
  pinned,
  onPin,
  selectionMode = false,
  selected = false,
  onToggleSelect,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState(0);
  const [copied, setCopied] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const cardRef = useRef(null);
  const { activeTag, setActiveTag, updateTask, deleteTask, addTask, searchQuery } = useBoard();
  const { suggestedTags, loadingTags, handleSuggestTags, handleAddTag } = useSuggestTags(task, selectedSnippet, updateTask);
  const [showPreview, setShowPreview] = useState(false)

  // TODO: connect isDark to ThemeContext when light mode is implemented
  const isDark = true;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(task.title);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  // Right-click context menu (Edit / Delete / Duplicate) ---------
  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleDuplicate = async () => {
    closeContextMenu();
    try {
      await addTask({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        labelColor: task.labelColor,
        tags: task.tags,
        snippets: task.snippets?.map(({ language, code }) => ({
          language,
          code,
        })),
        dueDate: task.dueDate,
      });
    } catch (err) {
      console.error("Failed to duplicate task:", err);
    }
  };

  const getTaskAge = (createdAt) => {
  const days = Math.floor(
    (Date.now() - new Date(createdAt)) / 86400000
  );
  return days;
};

const age = getTaskAge(task.createdAt);

const estimatedPomodoros = estimateToPomodoros(task.estimate);
const actualPomodoros = task.pomodoroCount || 0;

  // Close the menu when clicking (or right-clicking) elsewhere
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => closeContextMenu();
    const handleRightClick = (e) => {
      if (!cardRef.current?.contains(e.target)) closeContextMenu();
    };
    window.addEventListener("click", handleClick);
    window.addEventListener("contextmenu", handleRightClick);
    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("contextmenu", handleRightClick);
    };
  }, [contextMenu]);

  // Check if the task due date has passed and the task is not completed ---------
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(task.dueDate);
  const isOverdue = task.dueDate && dueDate < today && task.status !== "done";
  const isDueToday =
    task.dueDate &&
    task.status !== "done" &&
    !isOverdue &&
    dueDate.toDateString() === today.toDateString();
  // const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "Done";
  // ------------------

  return (
    <Draggable draggableId={String(task._id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={(el) => {
            provided.innerRef(el);
            cardRef.current = el;
          }}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() =>
            selectionMode ? onToggleSelect(task._id) : onSelect(task)
          }
          onContextMenu={handleContextMenu}
          style={{
            ...provided.draggableProps.style,
            ...(task.labelColor
              ? { borderLeft: `3px solid ${task.labelColor}` }
              : {}),
          }}
          className={`card group bg-[var(--bg-card)] border rounded-lg p-3 cursor-pointer transition-all
            hover:shadow-lg ${GLOW[task.priority] || "hover:shadow-purple-500/20"}
            ${snapshot.isDragging ? "border-purple-500 shadow-lg shadow-purple-500/10" : isOverdue
              ? "border-red-500 border-l-4 hover:border-red-400" : "border-[var(--border-primary)] hover:border-[var(--border-hover)]"}`}
        >
         
          {/* Title */}
          <div className="flex items-start justify-between gap-2 mb-2">
            {selectionMode && (
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggleSelect(task._id)}
                onClick={(e) => e.stopPropagation()}
                className="accent-purple-500 shrink-0 mt-0.5 cursor-pointer"
              />
            )}

            <p className="text-sm font-medium text-[#f0f0f0] leading-snug min-w-0 break-words">
              {highlightMatch(task.title, searchQuery)}
            </p>

            <button
              type="button"
              onClick={handleCopy}
              aria-label={copied ? "Task title copied" : "Copy task title"}
              title={copied ? "Copied!" : "Copy title"}
              className="shrink-0 text-xs"
            >
              {copied ? "✅" : "📋"}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPin(task._id);
              }}
              aria-label={pinned ? "Unpin task" : "Pin task"}
              title={pinned ? "Unpin task" : "Pin task"}
              className="shrink-0 text-xs"
            >
              {pinned ? "📌" : "📍"}
            </button>
          </div>
          
          {/* Description */}
          {task.description && (
            <div
              onMouseEnter={() => setShowPreview(true)}
              onMouseLeave={() => setShowPreview(false)}
              className="text-[10px] text-[#555] hover:text-[#888]"
            >
              💬 preview

              {showPreview && (
                <div>
                  {task.description.slice(0, 100)}
                  {task.description.length > 100 && "..."}
                </div>
              )}
            </div>
          )}

          {/* GitHub issue link */}
          {task.githubIssueUrl && (
            <a
              href={task.githubIssueUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] hover:text-purple-400 mb-2"
            >
              <span>🔗</span> #{task.githubIssueNumber} GitHub Issue
            </a>
          )}

          {/* Code snippets preview */}
          {task.snippets?.length > 0 && (
            <div className=" mb-2">
              <div className="flex items-center justify-between mb-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded((v) => !v);
                  }}
                  className="text-[10px] text-purple-400 hover:text-purple-300 mb-1"
                >
                  {"</>"} {task.snippets.length} snippet
                  {task.snippets.length > 1 ? "s" : ""} {expanded ? "▲" : "▼"}
                </button>

                <button
                  onClick={handleSuggestTags}
                  disabled={loadingTags}
                  className="text-[10px] px-2 py-1 rounded bg-purple-600 text-white hover:bg-purple-700"
                >
                  {loadingTags ? "Loading..." : "Suggest tags"}
                </button>
              </div>


              <div className="flex gap-1 mb-2">
                {task.snippets.map((snippet, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSnippet(index);
                    }}
                    className="text-[10px] px-2 py-1 rounded bg-[var(--border-primary)]"
                  >
                    Snippet {index + 1}
                  </button>
                ))}
              </div>

              {suggestedTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {suggestedTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddTag(tag);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/40"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              )}


              {/* Updated Snippet Block with Copy Button */}
              {expanded && (
                <>
                  <div className="flex justify-end mb-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(
                          task.snippets[selectedSnippet].code
                        );
                      }}
                      className="text-[10px] px-2 py-1 rounded bg-purple-600 text-white hover:bg-purple-700"
                    >
                      Copy
                    </button>
                  </div>

                  <div className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--border-primary)] text-[var(--text-secondary)] border border-[var(--border-primary)] w-fit mb-1.5">
                    {task.snippets[selectedSnippet].language || "javascript"}
                  </div>

                  <SyntaxHighlighter
                    language={
                      task.snippets[selectedSnippet].language || "javascript"
                    }
                    style={isDark ? vscDarkPlus : vs}
                    customStyle={{
                      fontSize: 10,
                      borderRadius: 6,
                      margin: 0,
                      padding: "8px 10px",
                    }}
                  >
                    {task.snippets[selectedSnippet].code}
                  </SyntaxHighlighter>
                </>
              )}
            </div>
          )}

          {/* Tags + Priority */}
          <div className="flex flex-wrap gap-1 mt-1">
            {task.priority && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PRIORITY_COLORS[task.priority]}`}
              >
                {task.priority}
              </span>
            )}
            {task.tags?.map((tag) => {
              const t = tag.trim(); // legacy rows may hold untrimmed tags
              return (
                <span
                  key={t}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTag(activeTag === tag ? null : tag);
                  }}
                  className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition
                    ${getTagColor(tag)}
                    ${activeTag === tag
                      ? "ring-1 ring-purple-500"
                      : "hover:brightness-125"
                    }`}
                >
                  {highlightMatch(
                    t.length > 15 ? t.slice(0, 15) + "..." : t,
                    searchQuery
                  )}
                </span>
              );
            })}
          </div>

          {/* Due date */}
          {task.dueDate && (
            <div
              className={`mt-2 text-[10px] flex items-center gap-1.5 ${isOverdue ? "text-red-400" : "text-[var(--text-secondary)]"
                }`}
            >
              <span>📅 {new Date(task.dueDate).toLocaleDateString()}</span>
              {isDueToday && (
                <span
                  className="bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded px-1 py-0.5 leading-none font-medium"
                  title="This task is due today"
                >
                  due today!
                </span>
              )}
            </div>
          )}
          {task.estimate && (
            <div className="mt-1 text-[10px] flex items-center gap-1.5 text-[var(--text-secondary)]">
              <span>⏱️ {task.estimate}</span>
            </div>
          )}

          {age >= 14 && task.status !== 'done' && (
            <span className="mt-1 text-[10px] flex items-center gap-1.5 text-[var(--text-secondary)]"> 
                🕰️ {age}d old
            </span>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 text-[var(--text-muted)] text-[10px]">
              {estimatedPomodoros && (
                <span
                  className={
                    actualPomodoros > estimatedPomodoros
                      ? "text-red-400"
                      : "text-green-400"
                  }
                >
                  🍅 {actualPomodoros}/{estimatedPomodoros} sessions
                </span>
              )}
              {task.snippets?.length > 0 && (
                <span>📎 {task.snippets.length}</span>
              )}
              {task.createdAt && (
                <span>🕐 {timeAgo(task.createdAt)}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(task);
                }}
                aria-label="Edit task"
                title="Edit task"
                className="opacity-0 group-hover:opacity-100 text-[10px] px-2 py-1 rounded bg-gray-600 text-white hover:bg-gray-700 transition-opacity"
              >
                ✏️
              </button>

              {task.assignee?.name && (
                <div title={task.assignee.name} className={`w-5 h-5 rounded-full ${getAvatarColor(task.assignee.name)} flex items-center justify-center text-[9px] font-bold text-white`}>
                  {task.assignee.name[0].toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Last updated */}
          
          {task.updatedAt && (
            <div className="mt-1 text-[10px] text-[var(--text-secondary)]">
              ✏️ updated {timeAgo(task.updatedAt)}
            </div>
          )}

          {/* Context menu */}
          {contextMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
              style={{ top: contextMenu.y, left: contextMenu.x }}
              className="fixed z-50 w-32 py-1 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg shadow-lg"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeContextMenu();
                  onSelect(task);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--border-primary)]"
              >
                ✏️ Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeContextMenu();
                  deleteTask(task._id).catch((err) =>
                    console.error("Failed to delete task:", err)
                  );
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-red-500/10"
              >
                🗑️ Delete
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDuplicate();
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--border-primary)]"
              >
                📄 Duplicate
              </button>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;
