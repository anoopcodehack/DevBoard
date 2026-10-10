import React, { useEffect, useMemo, useState } from "react";
import { Droppable } from "@hello-pangea/dnd";
import TaskCard from "./TaskCard";
import { useBoard } from "../../context/BoardContext";
import { getAvatarColor } from "../../utils/avatarColor";
import {
  PlusIcon,
  CodeIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "../common/Icons";
import confetti from "canvas-confetti";

const COLUMN_CONFIG = {
  backlog: {
    label: "Backlog",
    color: "#71717a",
    dot: "bg-zinc-400",
    headerBg: "border-zinc-800",
  },
  inprogress: {
    label: "In Progress",
    color: "#3b82f6",
    dot: "bg-blue-400",
    headerBg: "border-blue-500/20",
  },
  review: {
    label: "In Review",
    color: "#f59e0b",
    dot: "bg-amber-400",
    headerBg: "border-amber-500/20",
  },
  done: {
    label: "Completed",
    color: "#10b981",
    dot: "bg-emerald-400",
    headerBg: "border-emerald-500/20",
  },
};

const WIP_LIMIT = 5;

const Column = ({
  columnId,
  tasks,
  onSelectTask,
  onAddTask,
  isActive,
  columns = [],
}) => {
  const { tasks: allTasks, allTasks: unfilteredTasks, updateTask } = useBoard();

  const [sorted, setSorted] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [animate, setAnimate] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const [pinnedIds, setPinnedIds] = useState(() => {
    try {
      return new Set(
        tasks
          .filter((task) => localStorage.getItem(`pin_${task._id}`) === "true")
          .map((task) => task._id),
      );
    } catch {
      return new Set();
    }
  });

  const handlePin = (id) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      const nowPinned = !next.has(id);
      if (nowPinned) {
        next.add(id);
      } else {
        next.delete(id);
      }
      try {
        localStorage.setItem(`pin_${id}`, String(nowPinned));
      } catch {
        // Ignore
      }
      return next;
    });
  };

const fireConfetti = () => {
  confetti({
    particleCount: 120,
    spread: 70,
    origin: { y: 0.65 },
    colors: ["#22c55e", "#3b82f6", "#facc15", "#a78bfa"],
  });
};

const toggleSelectionMode = () => {
  if (selectionMode) {
    setSelectedIds(new Set());
  }

  setSelectionMode((value) => !value);
};



  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  
const handleMoveTo = async (target) => {
  const idsToMove = [...selectedIds];

  if (!selectionMode || idsToMove.length === 0 || target === columnId) {
    return;
  }

  console.log("Bulk move started:", { target, idsToMove });

  const targetTasks = allTasks.filter(
    (task) => String(task.status) === String(target)
  );

  let base = targetTasks.reduce(
    (max, task) => Math.max(max, Number(task.order) || 0),
    -1
  );

  try {
    const tasksToMove = idsToMove
      .map((id) =>
        allTasks.find((task) => String(task._id) === String(id))
      )
      .filter(Boolean);

    if (tasksToMove.length === 0) {
      console.error("No selected tasks matched allTasks.");
      return;
    }

    await Promise.all(
      tasksToMove.map((task) => {
        base += 1;

        return updateTask(String(task._id), {
          status: target,
          order: base,
        });
      })
    );

    if (target === "done") {
      fireConfetti();
    }

    setSelectedIds(new Set());
    setSelectionMode(false);
  } catch (error) {
    console.error("Bulk move failed:", error);
  }
};


  useEffect(() => {
    setAnimate(true);
    const timeout = setTimeout(() => setAnimate(false), 250);
    return () => clearTimeout(timeout);
  }, [tasks.length]);

  const displayTasks = (
    sorted
      ? [...tasks].sort((a, b) => {
          const order = { high: 0, medium: 1, low: 2 };
          return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
        })
      : [...tasks]
  ).sort(
    (a, b) => (pinnedIds.has(b._id) ? 1 : 0) - (pinnedIds.has(a._id) ? 1 : 0),
  );

  const totalSnippets = useMemo(
    () =>
      (unfilteredTasks || [])
        .filter((task) => task.status === columnId)
        .reduce((sum, task) => sum + (task.snippets?.length || 0), 0),
    [unfilteredTasks, columnId],
  );

  const priorities = useMemo(() => {
    const inColumn = (unfilteredTasks || []).filter(
      (task) => task.status === columnId,
    );
    return {
      high: inColumn.filter((task) => task.priority === "high").length,
      medium: inColumn.filter((task) => task.priority === "medium").length,
    };
  }, [unfilteredTasks, columnId]);

  const ASSIGNEES_SHOWN = 3;
  const assignees = useMemo(() => {
    const byId = new Map();
    for (const task of unfilteredTasks || []) {
      if (task.status !== columnId) continue;
      const person = task.assignee;
      if (!person?._id || !person.name) continue;
      if (!byId.has(person._id)) byId.set(person._id, person);
    }
    const all = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
    return {
      shown: all.slice(0, ASSIGNEES_SHOWN),
      extra: all.slice(ASSIGNEES_SHOWN),
    };
  }, [unfilteredTasks, columnId]);

  const config = COLUMN_CONFIG[columnId] || {
    label: columnId,
    dot: "bg-zinc-400",
    color: "#71717a",
  };

  const isOverLimit = columnId === "inprogress" && tasks.length > WIP_LIMIT;

  const blockedCount = useMemo(
    () => (tasks || []).filter((task) => task.blockedBy?.length > 0).length,
    [tasks],
  );
  return (
    <div
      className={`flex flex-col w-full md:w-72 flex-shrink-0 transition-all ${
        isActive ? "ring-1 ring-blue-500/50" : ""
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-2 py-2 mb-2 bg-[#0d0e13] border border-zinc-800/80 rounded-lg">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? "Expand column" : "Collapse column"}
            className="text-zinc-500 hover:text-zinc-300 transition p-0.5"
          >
            {collapsed ? (
              <ChevronRightIcon className="w-3.5 h-3.5" />
            ) : (
              <ChevronDownIcon className="w-3.5 h-3.5" />
            )}
          </button>

          {selectionMode ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleSelectionMode}
                className="text-[11px] font-mono-code text-blue-400 hover:underline"
              >
                Done
              </button>
              <select
                defaultValue=""
              onChange={(e) => handleMoveTo(e.target.value)}
                className="text-[12px] font-mono-code bg-zinc-900 border border-zinc-700 text-zinc-300 rounded px-1.5 py-0.5"
              >
                <option value="" disabled>
                  Move {selectedIds.size} to…
                </option>
                {columns
                  .filter((c) => c !== columnId)
                  .map((c) => (
                    <option key={c} value={c}>
                      {COLUMN_CONFIG[c]?.label || c}
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${config.dot}`} />
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-200 truncate font-mono-code">
                {config.label}
              </span>
             
          <span
            className={`text-[11px] font-mono-code px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/60 transition-transform ${
              animate ? "scale-110" : ""
            }`}
          >
            {tasks.length}
          </span>

{blockedCount > 0 && (
  <span
    title={`${blockedCount} blocked task${blockedCount === 1 ? "" : "s"}`}
    aria-label={`${blockedCount} blocked tasks`}
    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-rose-500/20 bg-rose-500/[0.08] px-1.5 py-0.5 text-[10px] font-mono-code text-rose-400"
  >
    <span aria-hidden="true">🚫</span>
    <span>{blockedCount}</span>
  </span>
)}



              {/* Priority Badges in Header */}
              {priorities.high > 0 && (
                <span
                  title={`${priorities.high} high priority tasks`}
                  className="text-[10px] font-mono-code text-rose-400 bg-rose-500/10 px-1 rounded border border-rose-500/20"
                >
                  P0:{priorities.high}
                </span>
              )}

              {/* Code Snippets count */}
              {totalSnippets > 0 && (
                <span
                  title={`${totalSnippets} snippets in column`}
                  className="text-[10px] font-mono-code text-blue-400 bg-blue-500/10 px-1 rounded border border-blue-500/20 flex items-center gap-0.5"
                >
                  <CodeIcon className="w-2.5 h-2.5" />
                  <span>{totalSnippets}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Header Right Controls */}
        {!collapsed && !selectionMode && (
          <div className="flex items-center gap-1 shrink-0">
            {tasks.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectionMode}
                title="Select multiple tasks to move"
                className="text-[10px] font-mono-code text-zinc-500 hover:text-zinc-300 px-1.5 py-0.5 rounded hover:bg-zinc-800 transition"
              >
                Select
              </button>
            )}

            <button
              type="button"
              onClick={() => setSorted((v) => !v)}
              title={sorted ? "Restore default order" : "Sort by priority"}
              className={`text-[10px] font-mono-code px-1.5 py-0.5 rounded transition ${
                sorted
                  ? "bg-zinc-800 text-blue-400"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              Sort
            </button>

            <button
              type="button"
              onClick={() => onAddTask(columnId)}
              title={`Add task to ${config.label}`}
              className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition"
            >
              <PlusIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {isOverLimit && (
        <div className="mb-2 px-2.5 py-1 text-[11px] font-mono-code text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-md flex items-center gap-1.5">
          <span>⚠️</span>
          <span>
            WIP limit exceeded ({tasks.length}/{WIP_LIMIT})
          </span>
        </div>
      )}

      {/* Column Droppable Container */}
      <Droppable droppableId={columnId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-col gap-2 rounded-xl p-2 transition-colors flex-1 min-h-[450px] bg-[#0c0d12]/50 border border-zinc-900 ${
              snapshot.isDraggingOver
                ? "bg-blue-950/15 border-blue-500/30 ring-1 ring-blue-500/20"
                : ""
            }`}
          >
            {collapsed ? (
              <div className="flex items-center justify-center text-center p-3 text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-lg font-mono-code">
                {tasks.length} task{tasks.length === 1 ? "" : "s"} hidden
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-6 text-xs text-zinc-600 border border-dashed border-zinc-800/80 rounded-lg my-auto font-mono-code">
                <span className="text-zinc-500 mb-1">No active tasks</span>
                <span className="text-[10px] text-zinc-600">
                  Drag a card here or press N
                </span>
              </div>
            ) : (
              displayTasks.map((task, index) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  index={index}
                  onSelect={onSelectTask}
                  pinned={pinnedIds.has(task._id)}
                  onPin={handlePin}
                  selectionMode={selectionMode}
                  selected={selectedIds.has(task._id)}
                  onToggleSelect={toggleSelect}
                />
              ))
            )}

            {provided.placeholder}

            {!collapsed && (
              <button
                type="button"
                onClick={() => onAddTask(columnId)}
                className="mt-1 w-full py-2 px-3 border border-dashed border-zinc-800 hover:border-zinc-700 bg-transparent hover:bg-zinc-900/40 rounded-lg text-xs font-mono-code text-zinc-500 hover:text-zinc-300 transition flex items-center justify-center gap-1.5"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Add task</span>
              </button>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default Column;
