import React, { useEffect, useMemo, useState } from "react";
import { Droppable } from "@hello-pangea/dnd";
import TaskCard from "./TaskCard";
import { useBoard } from "../../context/BoardContext";

const COLUMN_CONFIG = {
  backlog: { label: "Backlog", color: "#888", dot: "bg-gray-500" },
  inprogress: {
    label: "In Progress",
    color: "var(--accent)",
    dot: "bg-[var(--accent)]",
  },
  review: { label: "Review", color: "#EF9F27", dot: "bg-yellow-500" },
  done: { label: "Done", color: "#639922", dot: "bg-green-500" },
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
  // `tasks` from the context is already filtered by search and tag, so the
  // local name allTasks below promises more than it holds. The snippet count
  // needs the unfiltered set, otherwise it drops while you type in the search.
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
          .map((task) => task._id)
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

  const toggleSelectionMode = () => {
    if (selectionMode) setSelectedIds(new Set());
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
    if (!selectionMode || selectedIds.size === 0 || target === columnId) return;

    const targetTasks = allTasks.filter(
      (task) => String(task.status) === String(target)
    );

    let base = targetTasks.reduce(
      (max, task) => Math.max(max, Number(task.order) || 0),
      -1
    );

    const updates = [...selectedIds].map((id) => {
      const task = allTasks.find((t) => String(t._id) === String(id));
      if (!task) return null;

      base += 1;

      return updateTask(String(task._id), {
        status: target,
        order: base,
      });
    });

    await Promise.all(updates);

    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  useEffect(() => {
    setAnimate(true);

    const timeout = setTimeout(() => setAnimate(false), 300);

    return () => clearTimeout(timeout);
  }, [tasks.length]);

  const displayTasks = (
    sorted
      ? [...tasks].sort((a, b) => {
          const order = {
            high: 0,
            medium: 1,
            low: 2,
          };

          return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
        })
      : [...tasks]
  ).sort(
    (a, b) =>
      (pinnedIds.has(b._id) ? 1 : 0) -
      (pinnedIds.has(a._id) ? 1 : 0)
  );

  // A property of the column, not of the current view: counted over every task
  // with this status, whatever the search box and the priority filter say.
  const totalSnippets = useMemo(
    () =>
      (unfilteredTasks || [])
        .filter((task) => task.status === columnId)
        .reduce((sum, task) => sum + (task.snippets?.length || 0), 0),
    [unfilteredTasks, columnId],
  );

  const config = COLUMN_CONFIG[columnId] || {
    label: columnId,
    dot: "bg-gray-500",
    color: "#888",
  };

  const isOverLimit =
    columnId === "inprogress" && tasks.length > WIP_LIMIT;

  return (
    <div
      className={`flex flex-col w-full md:w-56 flex-shrink-0 rounded-lg transition-all ${
        isActive
          ? "border border-[var(--accent)] shadow-[0_0_12px_var(--accent-20)]"
          : "border border-transparent"
      }`}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-expanded={!collapsed}
            title={collapsed ? "Expand column" : "Collapse column"}
            className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] transition"
          >
            {collapsed ? "▶" : "▼"}
          </button>

          {selectionMode ? (
            <>
              <button
                type="button"
                onClick={toggleSelectionMode}
                title="Exit selection mode"
                className="text-[10px] text-[var(--accent)] hover:brightness-125 transition"
              >
                ☑ Exit Select mode
              </button>

              <select
                defaultValue=""
                onChange={(e) => handleMoveTo(e.target.value)}
                className="text-[10px] bg-[var(--bg-input)] border border-[var(--border-primary)] text-[#888] rounded px-1 py-0.5 focus:border-[var(--accent)] focus:outline-none"
              >
                <option value="" disabled>
                  Move to…
                </option>

                {columns
                  .filter((col) => col !== columnId)
                  .map((col) => (
                    <option key={col} value={col}>
                      {COLUMN_CONFIG[col]?.label ?? col}
                    </option>
                  ))}
              </select>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${config.dot}`} />

              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                {config.label}
              </span>

              <span
                className={`text-[10px] bg-[var(--border-primary)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded-full transition-transform duration-300 ${
                  animate ? "scale-125" : "scale-100"
                }`}
              >
                {tasks.length}
              </span>

              {totalSnippets > 0 && (
                <span
                  title={`${totalSnippets} code snippet${totalSnippets === 1 ? "" : "s"} in this column`}
                  className="text-[10px] text-[var(--text-secondary)] flex items-center gap-0.5"
                >
                  <span aria-hidden="true">{"</>"}</span>
                  {totalSnippets}
                </span>
              )}
            </div>
          )}
        </div>

        {!collapsed && !selectionMode && (
          <div className="flex items-center gap-2">
            {tasks.length >= 1 && (
              <button
                type="button"
                onClick={toggleSelectionMode}
                title="Select tasks to move"
                className="text-[10px] text-[#555] hover:text-[var(--accent)] transition"
              >
                ☑ Select
              </button>
            )}

            <button
              type="button"
              onClick={() => setSorted((value) => !value)}
              className="text-[10px] text-[#555] hover:text-[var(--accent)] transition"
            >
              {sorted ? "🔃 sorted" : "🔃 sort"}
            </button>
          </div>
        )}
      </div>

      {isOverLimit && (
        <div className="mb-2 px-2 py-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md">
          ⚠️ WIP limit exceeded! ({tasks.length}/{WIP_LIMIT})
        </div>
      )}

      <Droppable droppableId={columnId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-col gap-2 rounded-lg p-1 transition-colors flex-1 min-h-[80px] ${
              snapshot.isDraggingOver ? "bg-[var(--accent-10)]" : ""
            }`}
          >
            {collapsed ? (
              <div className="flex items-center justify-center text-center p-2 text-xs text-[var(--text-secondary)] border border-dashed border-[var(--border-primary)] rounded-md">
                {tasks.length === 1
                  ? "1 task hidden"
                  : `${tasks.length} tasks hidden`}
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex items-center justify-center text-center p-3 text-xs text-[var(--text-secondary)] border border-dashed border-[var(--border-primary)] rounded-md my-auto">
                No tasks here — drag one in or click + Add card
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
          </div>
        )}
      </Droppable>

      {!collapsed && (
        <button
          onClick={() => onAddTask(columnId)}
          className="mt-2 flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] px-2 py-1.5 rounded hover:bg-[var(--bg-card)] transition"
        >
          <span>＋</span>
          Add card
        </button>
      )}
    </div>
  );
};

export default Column;