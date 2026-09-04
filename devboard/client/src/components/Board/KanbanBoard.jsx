import React, { useState, useEffect, useRef } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import Column from "./Column";
import TaskModal from "../Task/TaskModal";
import { useBoard } from "../../context/BoardContext";
import confetti from "canvas-confetti";

const COLUMNS = ["backlog", "inprogress", "review", "done"];


const KanbanBoard = ({ tasks: filteredTasks, onSelectTask, activeCol, priorityFilter = "all", focusMode = false }) => {

  const { tasks, updateTask, addTask, loading } = useBoard();
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

  const getTasksByStatus = (status) =>

    displayedTasks
      .filter((t) => t.status === status)
      .filter((t) => priorityFilter === "all" || t.priority?.toLowerCase() === priorityFilter)
      .sort((a, b) => a.order - b.order);

  

  const visibleColumns = focusMode
    ? columns.filter((col) => col.toLowerCase() !== "done")
    : columns;

  const isEmpty = visibleColumns.every(col => getTasksByStatus(col).length === 0);
  const totalTasks = tasks.length;
  const playDoneSound = () => {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

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

      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.5);
    });
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    // Dropped in the same place — nothing to do
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (
      destination.droppableId === "done" &&
      source.droppableId !== "done"
    ) {
      confetti({ particleCount: 100, spread: 70 });
       playDoneSound();
    }

    const sourceTasks = Array.from(getTasksByStatus(source.droppableId));
    const destTasks =
      source.droppableId === destination.droppableId
        ? sourceTasks
        : Array.from(getTasksByStatus(destination.droppableId));

    // Prefer the task at source.index; fall back to draggableId
    const idMatch = (task) => String(task._id) === String(draggableId);
    let moved =
      sourceTasks[source.index] && idMatch(sourceTasks[source.index])
        ? sourceTasks[source.index]
        : sourceTasks.find(idMatch) || tasks.find(idMatch);

    if (!moved) return;

    // Remove from source column list
    const sourceIndex = sourceTasks.findIndex(
      (t) => String(t._id) === String(moved._id),
    );
    if (sourceIndex !== -1) {
      sourceTasks.splice(sourceIndex, 1);
    }

    if (source.droppableId === destination.droppableId) {
      // Same-column reorder
      sourceTasks.splice(destination.index, 0, moved);

      await Promise.all(
        sourceTasks.map((task, index) =>
          updateTask(task._id, {
            status: source.droppableId,
            order: index,
          }),
        ),
      );
      return;
    }

    // Cross-column move: insert into destination with new status
    destTasks.splice(destination.index, 0, {
      ...moved,
      status: destination.droppableId,
    });

    await Promise.all([
      // Re-order remaining tasks in the source column
      ...sourceTasks.map((task, index) =>
        updateTask(task._id, {
          status: source.droppableId,
          order: index,
        }),
      ),
      // Assign moved task + reorder destination column
      ...destTasks.map((task, index) =>
        updateTask(task._id, {
          status: destination.droppableId,
          order: index,
        }),
      ),
    ]);
  };

  const handleAddTask = (columnId) => {
    setDefaultStatus(columnId);
    setModalOpen(true);
  };

  const handleSubmit = () => {
    setColumns((prev) => [...prev, columnName]);
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
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={handleCancel}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCancel();
            if (e.key === 'Enter' && columnName.trim()) handleSubmit();
          }}
        >
          <div
            className="flex flex-col bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-6 w-96 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              type="text"
              placeholder="Enter column name"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              className="border border-[var(--border-primary)] rounded px-2 py-1 bg-[var(--bg-input)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-purple-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={!columnName.trim()}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="board board-bg flex flex-col md:flex-row gap-4 p-4 overflow-x-hidden md:overflow-x-auto overflow-y-auto h-full">
          {totalTasks === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center w-full py-24">
              <div className="text-6xl animate-bounce mb-4">
                🗂️
              </div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                Your board is empty!
              </h2>
              <p className="text-sm text-[var(--text-muted)] mb-6">
                Create your first task to get started
              </p>
              <button
                onClick={() => handleAddTask('backlog')}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition"
              >
                ✨ Create first task
              </button>
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center w-full h-64 text-gray-500">
              <span className="text-4xl mb-4">🔍</span>
              <h3 className="text-xl font-semibold mb-2">No tasks found!</h3>
              <p className="text-sm">Try a different filter or create a new task</p>
            </div>
          ) : (
            <>
              {columns.map((col) => (
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
              <button
                className="flex no-print"
                onClick={() => {
                  setShowinput(true);
                }}
              >
                + Add Column
              </button>
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
