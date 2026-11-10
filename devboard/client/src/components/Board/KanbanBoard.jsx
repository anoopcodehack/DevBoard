import React, { useState, useEffect, useRef } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import Column from "./Column";
import TaskModal from "../Task/TaskModal";
import { useBoard } from "../../context/BoardContext";
import confetti from "canvas-confetti";
import { toast } from "react-toastify";
import { columnLimit, isColumnFull } from "../../utils/columnLimits";
import { LogoIcon, SearchIcon, PlusIcon, XIcon } from "../common/Icons";
import { useBoardZoom } from "../../utils/boardZoom";

const COLUMNS = ["backlog", "inprogress", "review", "done"];

const KanbanBoard = ({
  tasks: filteredTasks,
  onSelectTask,
  onTaskCompleted,
  activeCol,
  priorityFilter = "all",
  focusMode = false,
}) => {
  const { tasks, allTasks, updateTask, addTask, loading } = useBoard();
  const zoom = useBoardZoom();
  const displayedTasks = filteredTasks ?? tasks;

  const [modalOpen, setModalOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState("backlog");

  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem("columns");
    return saved ? JSON.parse(saved) : COLUMNS;
  });

  const [showinput, setShowinput] = useState(false);
  const [columnName, setColumnName] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (showinput) {
      inputRef.current?.focus();
    }
  }, [showinput]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key.toLowerCase() === "n" && !e.target.matches("input, textarea")) {
        setDefaultStatus("backlog");
        setModalOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Arrow keys move the keyboard focus between cards: up and down inside a
  // column, left and right to the next column that has cards. Enter clicks the
  // focused card, so it opens the task (or toggles it in selection mode).
  // Works on the cards as rendered, so search, filters and sorting apply.
  useEffect(() => {
    const KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"];
    const handler = (e) => {
      if (!KEYS.includes(e.key)) return;
      // A keyboard drag in progress handles the arrows itself
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.target.closest?.("input, textarea, select, [contenteditable='true']")) return;
      // Any open modal (task, shortcuts, new column) uses a full-screen overlay
      if (document.querySelector(".fixed.inset-0")) return;

      const cols = [...document.querySelectorAll("[data-rfd-droppable-id]")]
        .map((col) => [...col.querySelectorAll("[data-rfd-drag-handle-draggable-id]")])
        .filter((cards) => cards.length > 0);
      if (cols.length === 0) return;

      const current = document.activeElement?.closest?.("[data-rfd-drag-handle-draggable-id]");
      let col = cols.findIndex((cards) => cards.includes(current));
      let row = col === -1 ? -1 : cols[col].indexOf(current);

      if (e.key === "Enter") {
        if (col === -1) return;
        e.preventDefault();
        current.click();
        return;
      }

      e.preventDefault();
      if (col === -1) {
        col = 0;
        row = 0;
      } else if (e.key === "ArrowDown") {
        row = Math.min(row + 1, cols[col].length - 1);
      } else if (e.key === "ArrowUp") {
        row = Math.max(row - 1, 0);
      } else {
        col = Math.min(Math.max(col + (e.key === "ArrowRight" ? 1 : -1), 0), cols.length - 1);
        row = Math.min(row, cols[col].length - 1);
      }
      const next = cols[col][row];
      next.focus();
      next.scrollIntoView({ block: "nearest", inline: "nearest" });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const getTasksByStatus = (status) =>
    displayedTasks
      .filter((t) => t.status === status)
      .filter(
        (t) =>
          priorityFilter === "all" ||
          t.priority?.toLowerCase() === priorityFilter
      )
      .sort((a, b) => a.order - b.order);

  const visibleColumns = focusMode
    ? columns.filter((col) => col.toLowerCase() !== "done")
    : columns;

  const isEmpty = visibleColumns.every(
    (col) => getTasksByStatus(col).length === 0
  );

  const totalTasks = tasks.length;

  const playDoneSound = () => {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      const ctx = new AudioContextClass();
      const notes = [523, 659, 784];
      notes.forEach((frequency, index) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + index * 0.1;
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.frequency.value = frequency;
        oscillator.type = "sine";
        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.4);
      });
    } catch {
      // Audio playback failed
    }
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Checked before anything moves, so a refused drop leaves the board as it was
    if (
      destination.droppableId !== source.droppableId &&
      isColumnFull(allTasks, destination.droppableId)
    ) {
      const limit = columnLimit(destination.droppableId);
      toast.error(`That column is full (${limit}/${limit}), move a task on first`);
      return;
    }

    const sourceTasks = Array.from(getTasksByStatus(source.droppableId));
    const destTasks =
      source.droppableId === destination.droppableId
        ? sourceTasks
        : Array.from(getTasksByStatus(destination.droppableId));

    const idMatch = (task) => String(task._id) === String(draggableId);

    const moved =
      sourceTasks[source.index] && idMatch(sourceTasks[source.index])
        ? sourceTasks[source.index]
        : sourceTasks.find(idMatch) || displayedTasks.find(idMatch);

    if (!moved) return;

    if (
      destination.droppableId === "done" &&
      source.droppableId !== "done"
    ) {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.8 } });
      playDoneSound();
      onTaskCompleted?.(moved);
    }

    const sourceIndex = sourceTasks.findIndex(
      (t) => String(t._id) === String(moved._id)
    );

    if (sourceIndex !== -1) {
      sourceTasks.splice(sourceIndex, 1);
    }

    if (source.droppableId === destination.droppableId) {
      sourceTasks.splice(destination.index, 0, moved);
      await Promise.all(
        sourceTasks.map((task, index) =>
          updateTask(task._id, {
            status: source.droppableId,
            order: index,
          })
        )
      );
      return;
    }

    destTasks.splice(destination.index, 0, {
      ...moved,
      status: destination.droppableId,
    });

    await Promise.all([
      ...sourceTasks.map((task, index) =>
        updateTask(task._id, {
          status: source.droppableId,
          order: index,
        })
      ),
      ...destTasks.map((task, index) =>
        updateTask(task._id, {
          status: destination.droppableId,
          order: index,
        })
      ),
    ]);
  };

  const handleAddTask = (columnId) => {
    setDefaultStatus(columnId);
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (!columnName.trim()) return;
    setColumns((prev) => [...prev, columnName.trim().toLowerCase()]);
    setColumnName("");
    setShowinput(false);
  };

  const handleCancel = () => {
    setShowinput(false);
    setColumnName("");
  };

  useEffect(() => {
    localStorage.setItem("columns", JSON.stringify(columns));
  }, [columns]);

  return (
    <>
      {showinput && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={handleCancel}
          onKeyDown={(e) => {
            if (e.key === "Escape") handleCancel();
            if (e.key === "Enter" && columnName.trim()) handleSubmit();
          }}
        >
          <div
            className="flex flex-col bg-[#121319] border border-zinc-800 rounded-xl p-5 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200 font-mono-code">
                Add New Column
              </h3>
              <button onClick={handleCancel} className="text-zinc-500 hover:text-zinc-300">
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            <input
              ref={inputRef}
              type="text"
              placeholder="e.g. testing, deployment"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              className="border border-zinc-800 rounded-lg px-3 py-2 bg-[#090a0e] text-xs font-mono-code text-zinc-100 placeholder-zinc-600 focus:border-blue-500 focus:outline-none mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!columnName.trim()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium transition disabled:opacity-50"
              >
                Create Column
              </button>
            </div>
          </div>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="board flex flex-col md:flex-row gap-4 p-5 overflow-x-hidden md:overflow-x-auto overflow-y-auto h-full min-h-[calc(100vh-140px)] bg-[var(--bg)]">
          {totalTasks === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center w-full py-20 text-center my-auto">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/5">
                <LogoIcon className="w-6 h-6" />
              </div>

              <h2 className="text-base font-semibold text-zinc-100 mb-1 tracking-tight">
                No active tasks on your board
              </h2>

              <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
                Create tasks, paste code snippets, link GitHub issues, and track your focus sessions.
              </p>

              <button
                type="button"
                onClick={() => handleAddTask("backlog")}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition shadow-sm shadow-blue-500/20 flex items-center gap-2 font-mono-code"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Create Task (N)</span>
              </button>
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center w-full py-16 text-center my-auto">
              <div className="w-10 h-10 rounded-lg bg-zinc-800/60 text-zinc-400 flex items-center justify-center mb-3">
                <SearchIcon className="w-5 h-5" />
              </div>

              <h3 className="text-sm font-semibold text-zinc-200 mb-1">
                No matching tasks found
              </h3>

              <p className="text-xs text-zinc-500 font-mono-code">
                Adjust your search query or filter tags to reveal tasks.
              </p>
            </div>
          ) : (
            <>
              {visibleColumns.map((col) => (
                <Column
                  key={col}
                  columnId={col}
                  tasks={getTasksByStatus(col)}
                  onSelectTask={onSelectTask}
                  onAddTask={handleAddTask}
                  isActive={columns.indexOf(col) === activeCol}
                  columns={columns}
                />
              ))}

              {/* Add Column Button */}
              <div
                style={zoom !== 1 ? { zoom } : undefined}
                className="flex-shrink-0 w-72 hidden md:flex items-start"
              >
                <button
                  type="button"
                  onClick={() => setShowinput(true)}
                  className="w-full py-2.5 px-3 border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/20 hover:bg-zinc-900/50 rounded-xl text-xs font-mono-code text-zinc-500 hover:text-zinc-300 transition flex items-center justify-center gap-1.5"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>New Column</span>
                </button>
              </div>
            </>
          )}
        </div>
      </DragDropContext>

      {modalOpen && (
        <TaskModal
          mode="create"
          defaultStatus={defaultStatus}
          onClose={() => setModalOpen(false)}
          onSave={async (data) => {
            await addTask(data);
            setModalOpen(false);
          }}
        />
      )}
    </>
  );
};

export default KanbanBoard;
