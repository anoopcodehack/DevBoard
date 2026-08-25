import React, { useState, useEffect } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import Column from "./Column";
import TaskModal from "../Task/TaskModal";
import { useBoard } from "../../context/BoardContext";
import confetti from "canvas-confetti";

const COLUMNS = ["backlog", "inprogress", "review", "done"];


const KanbanBoard = ({ tasks: filteredTasks, onSelectTask, activeCol, priorityFilter }) => {

  const { tasks, updateTask, addTask } = useBoard();
  const displayedTasks = filteredTasks ?? tasks;
  const [modalOpen, setModalOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState("backlog");

  const [columns, setColumns] = useState(() => {
      const saved = localStorage.getItem("columns");
      return saved ? JSON.parse(saved) : COLUMNS;
});
  const [showinput, setShowinput] = useState(false);
  const [columnName, setColumnName] = useState("");

  useEffect(() => {
    const handler = (e) => {
      if (e.key.toLowerCase() === "n" && !e.target.matches("input, textarea")) {
        setDefaultStatus("backlog");
        setModalOpen(true);
      }
    };

    window.addEventListener("keydown", handler);

    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, []);

  const getTasksByStatus = (status) =>

    displayedTasks
      .filter((t) => t.status === status)
      .filter((t) => priorityFilter === "all" || t.priority?.toLowerCase() === priorityFilter)
      .sort((a, b) => a.order - b.order);

  

  const isEmpty = COLUMNS.every(col => getTasksByStatus(col).length === 0);


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

    if (!columnName.trim()) {
      console.log("Empty column name!");
      return;
    }

    setColumns((prev) => {
      const updated = [...prev, columnName];
      return updated;
    });

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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col bg-white rounded-lg p-6 w-96 shadow-xl">
            <input
              type="text"
              placeholder="Enter column name"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              className="border rounded px-2 py-1 placeholder-gray-300 text-gray-950"
            />
            <div className="flex justify-between">
              <button onClick={handleCancel} className="p-4 text-red-600">
                Cancel
              </button>
              <button onClick={handleSubmit} className="p-4 text-green-600">
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-col md:flex-row gap-4 p-4 overflow-x-hidden md:overflow-x-auto overflow-y-auto h-full">
          {isEmpty ? (
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
                />
              ))}
              <button
                className="flex"
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
