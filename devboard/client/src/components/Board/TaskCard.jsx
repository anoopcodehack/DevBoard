import { useState, useEffect, useRef } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useBoard } from "../../context/BoardContext";
import { useSuggestTags } from "../../hooks/useSuggestTags";
import { getAvatarColor } from "../../utils/avatarColor";
import { unzoomDragStyle, useBoardZoom } from "../../utils/boardZoom";
import { timeAgo } from "../../utils/timeAgo";
import {
  CodeIcon,
  CopyIcon,
  CheckIcon,
  PinIcon,
  GithubIcon,
  ClockIcon,
  TimerIcon,
  PlayIcon,
  PauseIcon,
  EditIcon,
  TrashIcon,
  SparklesIcon,
} from "../common/Icons";

// react-syntax-highlighter gives line numbers the "comment" class, so without
// this they pick up the theme's green comment colour.
const snippetTheme = {
  ...vscDarkPlus,
  linenumber: { color: "#52525b" },
};

const PRIORITY_BADGES = {
  high: {
    label: "P0 High",
    classes: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    dot: "bg-rose-400",
  },
  medium: {
    label: "P1 Med",
    classes: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    dot: "bg-amber-400",
  },
  low: {
    label: "P2 Low",
    classes: "bg-zinc-800 text-zinc-400 border-zinc-700/60",
    dot: "bg-zinc-400",
  },
};

const STATUS_INDICATORS = {
  backlog: "border-l-zinc-700",
  inprogress: "border-l-blue-500",
  review: "border-l-amber-500",
  done: "border-l-emerald-500",
};

const STATUS_LABELS = {
  backlog: "Backlog",
  inprogress: "In Progress",
  review: "In Review",
  done: "Completed",
};

// Search escaping
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const highlightMatch = (text, query) => {
  const term = query?.trim();
  if (!term || !text) return text;

  const parts = String(text).split(new RegExp(`(${escapeRegExp(term)})`, "gi"));

  return parts.map((part, i) =>
    part.toLowerCase() === term.toLowerCase() ? (
      <mark
        key={i}
        className="bg-blue-500/25 text-blue-200 rounded px-0.5"
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

// Review complexity (#609): how much code a reviewer is looking at, from the
// total lines across the task's snippets. Empty snippets don't count.
const getComplexity = (task) => {
  const totalLines = (task.snippets || []).reduce((sum, snippet) => {
    const code = snippet?.code?.trim();
    return code ? sum + code.split("\n").length : sum;
  }, 0);
  if (!totalLines) return null;
  if (totalLines < 20) return { label: "Quick review", color: "text-emerald-400", lines: totalLines };
  if (totalLines < 50) return { label: "Medium review", color: "text-amber-400", lines: totalLines };
  return { label: "Deep review", color: "text-red-400", lines: totalLines };
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
  const [fontSize, setFontSize] = useState(11);
  const [wrapLines, setWrapLines] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const cardRef = useRef(null);
  const { activeTag, setActiveTag, updateTask, deleteTask, addTask, searchQuery } = useBoard();

  const snippetQuery = searchQuery?.trim().toLowerCase() || "";
  const snippetMatches =
    snippetQuery.length > 0 &&
    (task.snippets?.some((snippet) =>
      (snippet?.code || "").toLowerCase().includes(snippetQuery)
    ) ??
      false);

  const { suggestedTags, loadingTags, handleSuggestTags, handleAddTag } = useSuggestTags(task, selectedSnippet, updateTask);
  const [isFlipping, setIsFlipping] = useState(false);
  const prevStatus = useRef(task.status);
  const [isPriorityFlashing, setIsPriorityFlashing] = useState(false);
  const prevPriority = useRef(task.priority);

  useEffect(() => {
    if (prevStatus.current !== task.status) {
      setIsFlipping(true);
      const timer = setTimeout(() => setIsFlipping(false), 350);
      prevStatus.current = task.status;
      return () => clearTimeout(timer);
    }
  }, [task.status]);

  useEffect(() => {
    if (prevPriority.current === task.priority) return;

    prevPriority.current = task.priority;
    setIsPriorityFlashing(true);
    const timer = setTimeout(() => setIsPriorityFlashing(false), 600);
    return () => clearTimeout(timer);
  }, [task.priority]);

  // ── Time tracker ──────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0);
  const [tracking, setTracking] = useState(false);
  const intervalRef = useRef(null);

  const toggleTimer = (e) => {
    e.stopPropagation();
    if (tracking) {
      clearInterval(intervalRef.current);
    } else {
      intervalRef.current = setInterval(() => {
        setElapsed((s) => s + 1);
      }, 1000);
    }
    setTracking((t) => !t);
  };

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(task.title);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleDuplicate = async () => {
    closeContextMenu();
    try {
      await addTask({
        title: `${task.title} (copy)`,
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
    if (!createdAt) return 0;
    return Math.floor((Date.now() - new Date(createdAt)) / 86400000);
  };

  const age = getTaskAge(task.createdAt);

  const getDaysSinceUpdate = (updatedAt) => {
    if (!updatedAt) return 0;
    return Math.floor((Date.now() - new Date(updatedAt)) / 86400000);
  };

  const isStale =
    task.status === "inprogress" && getDaysSinceUpdate(task.updatedAt) >= 7;

  const estimatedPomodoros = estimateToPomodoros(task.estimate);
  const actualPomodoros = task.pomodoroCount || 0;

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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && dueDate < today && task.status !== "done";
  const complexity = task.status === "review" ? getComplexity(task) : null;

  const priorityMeta = PRIORITY_BADGES[task.priority?.toLowerCase()] || PRIORITY_BADGES.medium;
  const zoom = useBoardZoom();

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
            ...unzoomDragStyle(provided.draggableProps.style, zoom),
            ...(task.labelColor
              ? { borderLeftColor: task.labelColor }
              : {}),
          }}
          className={`card group bg-[#121319] hover:bg-[#161821] border border-zinc-800/80 hover:border-zinc-700/90 rounded-lg p-3 cursor-pointer transition-all duration-150 relative select-none shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/70
            border-l-[3px] ${task.labelColor ? "" : STATUS_INDICATORS[task.status] || "border-l-zinc-700"}
            ${snapshot.isDragging ? "shadow-2xl shadow-blue-900/40 border-blue-500 scale-[1.02]" : ""}
            ${isOverdue ? "!border-rose-500/80 !border-l-rose-500" : ""}
            ${selected ? "ring-2 ring-blue-500" : ""}
            ${isFlipping ? "card-flip" : ""}`}
        >
          {/* Card Top Metadata: Priority, ID, Pin, Copy */}
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectionMode && (
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggleSelect(task._id)}
                  onClick={(e) => e.stopPropagation()}
                  className="accent-blue-500 shrink-0 cursor-pointer w-3.5 h-3.5 rounded"
                />
              )}

              {/* Priority Pill */}
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono-code font-medium border transition-all duration-200 ${priorityMeta.classes} ${isPriorityFlashing ? "scale-125 ring-2 ring-white/30" : "scale-100"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${priorityMeta.dot}`} />
                {priorityMeta.label}
              </span>

              {/* GitHub Issue Reference */}
              {task.githubIssueNumber && (
                <a
                  href={task.githubIssueUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[10px] font-mono-code text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 hover:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700/50 transition"
                  title="View GitHub Issue"
                >
                  <GithubIcon className="w-3 h-3 text-zinc-400" />
                  <span>#{task.githubIssueNumber}</span>
                </a>
              )}

              {/* Pinned Indicator */}
              {pinned && (
                <span className="text-[10px] font-mono-code text-blue-400 bg-blue-500/10 border border-blue-500/30 px-1 py-0.5 rounded flex items-center gap-0.5">
                  <PinIcon className="w-2.5 h-2.5" fill="currentColor" />
                  <span>pin</span>
                </span>
              )}

              {isOverdue && (
                <span className="text-[10px] font-mono-code text-rose-400 bg-rose-500/10 border border-rose-500/30 px-1 py-0.5 rounded font-medium">
                  overdue
                </span>
              )}
            </div>

            {/* Quick action buttons (show on hover) */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={handleCopy}
                title={copied ? "Copied title" : "Copy title"}
                className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
              >
                {copied ? <CheckIcon className="w-3 h-3 text-emerald-400" /> : <CopyIcon className="w-3 h-3" />}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPin(task._id);
                }}
                title={pinned ? "Unpin task" : "Pin task"}
                className={`p-1 rounded transition ${pinned ? "text-blue-400" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"}`}
              >
                <PinIcon className="w-3 h-3" fill={pinned ? "currentColor" : "none"} />
              </button>
            </div>
          </div>

          {/* Title */}
          <h4 className="text-[13px] font-medium text-zinc-100 leading-snug tracking-tight break-words mb-1.5">
            {highlightMatch(task.title, searchQuery)}
          </h4>

          {/* Description Excerpt */}
          {task.description && (
            <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed mb-2 font-normal">
              {task.description}
            </p>
          )}

          {/* Tag Pills */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {task.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTag(activeTag === tag ? null : tag);
                  }}
                  className={`text-[10px] font-mono-code px-1.5 py-0.5 rounded transition border ${
                    activeTag === tag
                      ? "bg-blue-500 text-white border-blue-400 font-medium"
                      : "bg-zinc-800/70 hover:bg-zinc-700/80 text-zinc-400 hover:text-zinc-200 border-zinc-700/50"
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* Code Snippets Block */}
          {task.snippets?.length > 0 && (
            <div className="mb-2 rounded-md bg-[#0b0c10] border border-zinc-800 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-2.5 py-1 bg-zinc-900/80 border-b border-zinc-800/80 text-[11px]">
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 font-mono-code"
                >
                  <CodeIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-medium text-[10px]">
                    {task.snippets.length} snippet{task.snippets.length > 1 ? "s" : ""}
                  </span>
                  <span className="text-zinc-600 text-[10px]">{expanded ? "▲" : "▼"}</span>
                </button>

                {snippetMatches && (
                  <span className="text-[9px] font-mono-code px-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    query matched
                  </span>
                )}

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleSuggestTags}
                    disabled={loadingTags}
                    title="Generate tag suggestions with Gemini AI"
                    className="flex items-center gap-1 text-[10px] font-mono-code text-blue-400 hover:text-blue-300 px-1.5 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition disabled:opacity-50"
                  >
                    <SparklesIcon className="w-2.5 h-2.5" />
                    <span>{loadingTags ? "Analyzing..." : "AI Tags"}</span>
                  </button>
                </div>
              </div>

              {/* Snippet Tabs if multiple */}
              {task.snippets.length > 1 && (
                <div className="flex border-b border-zinc-800/60 bg-zinc-950 px-1.5 py-0.5 gap-1 overflow-x-auto">
                  {task.snippets.map((snippet, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedSnippet(idx)}
                      className={`text-[9px] font-mono-code px-2 py-0.5 rounded transition ${
                        selectedSnippet === idx
                          ? "bg-zinc-800 text-zinc-200 font-medium"
                          : "text-zinc-500 hover:text-zinc-400"
                      }`}
                    >
                      {snippet.language || `tab ${idx + 1}`}
                    </button>
                  ))}
                </div>
              )}

              {/* AI suggested tags list */}
              {suggestedTags.length > 0 && (
                <div className="p-1.5 bg-blue-950/20 border-b border-blue-900/30 flex flex-wrap gap-1">
                  <span className="text-[9px] font-mono-code text-blue-400 self-center">Add tag:</span>
                  {suggestedTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAddTag(tag)}
                      className="text-[9px] font-mono-code px-1.5 py-0.5 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-500/40 transition"
                    >
                      +{tag}
                    </button>
                  ))}
                </div>
              )}

              {/* Code viewer */}
              {expanded && (
                <div>
                  <div className="flex items-center justify-between px-2 py-1 bg-zinc-950 text-[10px] border-b border-zinc-800/60">
                    <span className="font-mono-code text-zinc-500 text-[9px] uppercase">
                      {task.snippets[selectedSnippet]?.language || "code"}
                    </span>
                    <div className="flex items-center gap-1 font-mono-code">
                      <button
                        type="button"
                        onClick={() => setWrapLines((w) => !w)}
                        className={`px-1.5 py-0.5 rounded text-[9px] ${wrapLines ? "bg-zinc-800 text-zinc-200" : "text-zinc-500 hover:text-zinc-400"}`}
                      >
                        wrap
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowLineNumbers((v) => !v)}
                        aria-pressed={showLineNumbers}
                        title={showLineNumbers ? "Hide line numbers" : "Show line numbers"}
                        className={`px-1.5 py-0.5 rounded text-[9px] ${showLineNumbers ? "bg-zinc-800 text-zinc-200" : "text-zinc-500 hover:text-zinc-400"}`}
                      >
                        lines
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const code = task.snippets[selectedSnippet]?.code || "";
                          navigator.clipboard.writeText(code);
                        }}
                        className="px-1.5 py-0.5 rounded text-[9px] text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 hover:bg-zinc-800 transition"
                      >
                        copy
                      </button>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-auto text-[11px] font-mono-code">
                    <SyntaxHighlighter
                      language={task.snippets[selectedSnippet]?.language || "javascript"}
                      style={snippetTheme}
                      wrapLongLines={wrapLines}
                      showLineNumbers={showLineNumbers}
                      // The theme sets white-space: pre and word-wrap: normal on the
                      // code element, which overrides the pre-wrap that
                      // wrapLongLines asks for and keeps long identifiers in one piece.
                      codeTagProps={{
                        style: {
                          ...vscDarkPlus['code[class*="language-"]'],
                          whiteSpace: wrapLines ? "pre-wrap" : "pre",
                          overflowWrap: wrapLines ? "anywhere" : "normal",
                          wordWrap: wrapLines ? "anywhere" : "normal",
                        },
                      }}
                      lineNumberStyle={{ minWidth: "2em", paddingRight: "1em", textIndent: 0, userSelect: "none" }}
                      // With wrapping and line numbers together the library makes
                      // every line a flex row, which turns each token into its own
                      // column. A hanging indent keeps wrapped text clear of the numbers.
                      lineProps={
                        wrapLines && showLineNumbers
                          ? { style: { display: "block", paddingLeft: "3em", textIndent: "-3em" } }
                          : undefined
                      }
                      customStyle={{
                        margin: 0,
                        padding: "8px 12px",
                        fontSize: `${fontSize}px`,
                        background: "#08090d",
                      }}
                    >
                      {task.snippets[selectedSnippet]?.code || ""}
                    </SyntaxHighlighter>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Bar: Timer, Estimates, Assignee, Actions */}
          <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-zinc-800/60 text-[10px] font-mono-code text-zinc-500">
            <div className="flex items-center gap-2.5">
              {/* Lightweight active timer */}
              <button
                type="button"
                onClick={toggleTimer}
                title={tracking ? "Pause time tracker" : "Start time tracker"}
                className={`inline-flex items-center gap-1 transition-colors px-1 py-0.5 rounded hover:bg-zinc-800 ${
                  tracking ? "text-emerald-400 font-semibold animate-pulse" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {tracking ? <PauseIcon className="w-2.5 h-2.5" /> : <PlayIcon className="w-2.5 h-2.5" />}
                <span>{formatTime(elapsed)}</span>
              </button>

              {/* Pomodoro count */}
              {estimatedPomodoros && (
                <span
                  title={`${actualPomodoros} of ${estimatedPomodoros} sessions completed`}
                  className={`inline-flex items-center gap-1 ${
                    actualPomodoros >= estimatedPomodoros ? "text-emerald-400 font-medium" : "text-zinc-400"
                  }`}
                >
                  <TimerIcon className="w-2.5 h-2.5 text-zinc-500" />
                  <span>{actualPomodoros}/{estimatedPomodoros}</span>
                </span>
              )}

              {/* Review complexity, only where a review is waiting */}
              {complexity && (
                <span
                  title={`${complexity.lines} line${complexity.lines !== 1 ? "s" : ""} of code in snippets`}
                  className={`inline-flex items-center gap-1 ${complexity.color}`}
                >
                  <CodeIcon className="w-2.5 h-2.5" />
                  <span>{complexity.label}</span>
                </span>
              )}

              {/* Estimate badge */}
              {task.estimate && !estimatedPomodoros && (
                <span className="inline-flex items-center gap-1 text-zinc-400">
                  <ClockIcon className="w-2.5 h-2.5 text-zinc-500" />
                  <span>{task.estimate}</span>
                </span>
              )}

              {/* Column the task was moved from */}
              {task.previousStatus && task.previousStatus !== task.status && (
                <span
                  title={`Moved here from ${STATUS_LABELS[task.previousStatus] || task.previousStatus}`}
                  className="text-zinc-500"
                >
                  ← from {STATUS_LABELS[task.previousStatus] || task.previousStatus}
                </span>
              )}

              {/* Age / Stale warning */}
              {isStale && (
                <span className="text-amber-400 font-medium">stale</span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Created relative time */}
              {task.createdAt && (
                <span className="text-zinc-600 text-[9px] hidden sm:inline">
                  {timeAgo(task.createdAt)}
                </span>
              )}

              {/* Assignee Avatar */}
              {task.assignee?.name && (
                <div
                  title={`Assigned to ${task.assignee.name}`}
                  className={`w-4 h-4 rounded-full ${getAvatarColor(task.assignee.name)} border border-zinc-900 flex items-center justify-center text-[8px] font-bold text-white shadow-sm`}
                >
                  {task.assignee.name[0].toUpperCase()}
                </div>
              )}

              {/* Edit button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(task);
                }}
                title="Edit task details"
                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition"
              >
                <EditIcon className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Context menu */}
          {contextMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
              style={{ top: contextMenu.y, left: contextMenu.x }}
              className="fixed z-50 w-36 py-1 bg-[#15161e] border border-zinc-700/80 rounded-lg shadow-2xl text-xs font-sans"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeContextMenu();
                  onSelect(task);
                }}
                className="w-full px-3 py-1.5 text-left text-zinc-200 hover:bg-zinc-800/80 flex items-center gap-2 transition"
              >
                <EditIcon className="w-3.5 h-3.5 text-zinc-400" />
                <span>Edit</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDuplicate();
                }}
                className="w-full px-3 py-1.5 text-left text-zinc-200 hover:bg-zinc-800/80 flex items-center gap-2 transition"
              >
                <CopyIcon className="w-3.5 h-3.5 text-zinc-400" />
                <span>Duplicate</span>
              </button>

              <div className="my-1 border-t border-zinc-800" />

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeContextMenu();
                  deleteTask(task._id).catch((err) =>
                    console.error("Failed to delete task:", err)
                  );
                }}
                className="w-full px-3 py-1.5 text-left text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition"
              >
                <TrashIcon className="w-3.5 h-3.5 text-rose-400" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;
