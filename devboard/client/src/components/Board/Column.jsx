import React, { useEffect, useState } from "react";
import { Droppable } from "@hello-pangea/dnd";
import TaskCard from "./TaskCard";

const COLUMN_CONFIG = {
  backlog: { label: "Backlog", color: "#888", dot: "bg-gray-500" },
  inprogress: { label: "In Progress", color: "#7F77DD", dot: "bg-purple-500", },
  review: { label: "Review", color: "#EF9F27", dot: "bg-yellow-500" },
  done: { label: "Done", color: "#639922", dot: "bg-green-500" },
};

const Column = ({
  columnId,
  tasks,
  onSelectTask,
  onAddTask,
  isActive,
}) => {
  const [sorted, setSorted] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);

    const timeout = setTimeout(() => setAnimate(false), 300);

    return () => clearTimeout(timeout);
  }, [tasks.length]);

  const displayTasks = sorted
    ? [...tasks].sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };

      return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
    })
    : tasks;

  const config =
    COLUMN_CONFIG[columnId] || {
      label: columnId,
      dot: "bg-gray-500",
      color: "#888",
    };

  return (
    <div
      className={`flex flex-col w-full md:w-56 flex-shrink-0 rounded-lg transition-all ${isActive
        ? "border border-purple-500/60 shadow-[0_0_12px_rgba(139,92,246,0.25)]"
        : "border border-transparent"
        }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${config.dot}`} />

          <span className="text-xs font-semibold uppercase tracking-wider text-[#888]">
            {config.label}
          </span>

          <span
            className={`text-[10px] bg-[var(--border-primary)] text-[#666] px-1.5 py-0.5 rounded-full transition-transform duration-300 ${animate ? "scale-125" : "scale-100"
              }`}
          >
            {tasks.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setSorted((value) => !value)}
          className="text-[10px] text-[#555] hover:text-purple-400 transition"
        >
          {sorted ? "🔃 sorted" : "🔃 sort"}
        </button>
      </div>

      {/* Droppable cards area */}
      <Droppable droppableId={columnId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-col gap-2 flex-1 min-h-[80px] rounded-lg p-1 transition-colors
              ${snapshot.isDraggingOver ? "bg-purple-500/5" : ""}`}
          >
            {tasks.length === 0 ? (
              <div className="flex items-center justify-center text-center p-3 text-xs text-[#666] border border-dashed border-[var(--border-primary)] rounded-md my-auto">
                No tasks here — drag one in or click + Add card
              </div>
            ) : (
              displayTasks.map((task, index) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  index={index}
                  onSelect={onSelectTask}
                />
              ))
            )}

            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* Add card button */}
      <button
        onClick={() => onAddTask(columnId)}
        className="mt-2 flex items-center gap-2 text-xs text-[#555] hover:text-[#888] px-2 py-1.5 rounded hover:bg-[var(--bg-card)] transition"
      >
        <span>＋</span> Add card
      </button>
    </div>
  );
};

export default Column;