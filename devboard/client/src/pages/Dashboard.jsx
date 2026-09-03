import React, { useState, useEffect } from "react";
import KanbanBoard from "../components/Board/KanbanBoard";
import PomodoroTimer from "../components/Pomodoro/PomodoroTimer";
import TaskModal from "../components/Task/TaskModal";
import Heatmap from "../components/Heatmap/Heatmap";
import { useBoard } from "../context/BoardContext";
import { useGithubStars } from "../hooks/useGithubStars";

const formatStars = (n) => {
  if (n === null || n === undefined) return null;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
};

const isNightTime = () => {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6;
};

const Dashboard = () => {
  const {
    user,
    logout,
    logoutAll,
    updateTask,
    deleteTask,
    loading,
    searchQuery,
    setSearchQuery,
    tasks,
    addTask,
    activeTag,
    setActiveTag,
  } = useBoard();

  const { stars, loading: starsLoading } = useGithubStars();

  useEffect(() => {
    document.title = "Dashboard — DevBoard";
  }, []);

  const [focusMode, setFocusMode] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Recently viewed tasks
  const [recentTasks, setRecentTasks] = useState(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("recent_tasks") || "[]"
      );
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  const [isCreatingFirstTask, setIsCreatingFirstTask] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNight, setIsNight] = useState(isNightTime());

  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("search_history") || "[]"
      );
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setIsNight(isNightTime());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", !isNight);
  }, [isNight]);

  useEffect(() => {
    const handleScroll = (event) => {
      let scrollTop = 0;

      if (event.target === document || event.target === window) {
        scrollTop = window.scrollY;
      } else if (event.target) {
        scrollTop = event.target.scrollTop;
      }

      setShowTop(scrollTop > 300);
    };

    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () =>
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
  }, []);

  const handleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.warn("Unable to toggle fullscreen mode:", error);
    }
  };

  // Save and select a recently viewed task.
  const handleSelectTask = (task) => {
    if (!task) return;

    let recent = [];

    try {
      const saved = JSON.parse(
        localStorage.getItem("recent_tasks") || "[]"
      );
      recent = Array.isArray(saved) ? saved : [];
    } catch {
      recent = [];
    }

    const updated = [
      task,
      ...recent.filter((t) => t?._id !== task._id),
    ].slice(0, 3);

    setRecentTasks(updated);
    localStorage.setItem("recent_tasks", JSON.stringify(updated));
    setSelectedTask(task);
  };

  if (loading) {
    return (
      <div className="flex gap-4 p-4">
        {[1, 2, 3, 4].map((col) => (
          <div key={col} className="flex flex-col w-56 gap-2">
            {[1, 2, 3].map((card) => (
              <div
                key={card}
                className="animate-pulse bg-[var(--bg-muted)] rounded-lg h-20 w-full"
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      logout();
    }
  };

  const handleLogoutAll = async () => {
    if (window.confirm("Are you sure you want to logout from all devices?")) {
      try {
        await logoutAll();
      } catch (err) {
        console.error("Logout from all devices failed:", err);
      }
    }
  };

  const handleClearDone = async () => {
    if (window.confirm("Clear all done tasks?")) {
      const doneTasks = tasks.filter((t) => t.status === "done");

      await Promise.all(
        doneTasks.map((t) => deleteTask(t._id))
      );
    }
  };

  const handleSessionComplete = async () => {
    if (selectedTask) {
      await updateTask(selectedTask._id, {
        pomodoroCount: (selectedTask.pomodoroCount || 0) + 1,
      });
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);

    const trimmed = query.trim();

    if (!trimmed) return;

    const updated = [
      trimmed,
      ...searchHistory.filter(
        (h) => h.toLowerCase() !== trimmed.toLowerCase()
      ),
    ].slice(0, 5);

    setSearchHistory(updated);
    localStorage.setItem("search_history", JSON.stringify(updated));
  };

  const handlePrint = () => {
    window.print();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) return "🌅 Good morning";
    if (hour < 17) return "🌞 Good afternoon";
    return "🌙 Good evening";
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-primary)]">
      {/* Top Navbar */}
      <div className="flex flex-col gap-3 px-5 py-3 bg-[var(--bg-card)] border-b border-[var(--border-primary)] md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-lg">🗂️</span>

          <span className="font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            DevBoard
          </span>

          <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded-full ml-1">
            beta
          </span>

          <span className="text-xs text-[var(--text-secondary)] ml-2">
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
          </span>

          {/* Recently viewed tasks */}
          {recentTasks.length > 0 && (
            <div className="flex items-center gap-1.5 ml-2 overflow-hidden">
              <span
                className="text-xs text-[var(--text-muted)] shrink-0"
                title="Recently viewed tasks"
              >
                🕐
              </span>

              {recentTasks.map((task) => (
                <button
                  key={task._id}
                  type="button"
                  onClick={() => handleSelectTask(task)}
                  title={task.title}
                  className="text-xs bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-purple-500/10 border border-[var(--border-primary)] px-2 py-1 rounded-full max-w-[140px] truncate transition"
                >
                  {task.title}
                </button>
              ))}
            </div>
          )}

          {activeTag && (
            <button
              onClick={() => setActiveTag(null)}
              className="text-xs bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-purple-600/40 transition"
            >
              #{activeTag} <span aria-hidden>✕</span>
            </button>
          )}
        </div>

        <div className="flex-1 w-full max-w-xl md:px-6 no-print">
          <label className="relative block">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch(searchQuery);
                }
              }}
              onBlur={() => handleSearch(searchQuery)}
              placeholder="Search tasks by title or tag..."
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15 transition"
            />
          </label>

          {searchHistory.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {searchHistory.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleSearch(h)}
                  className="text-[10px] text-[var(--text-muted)] hover:text-purple-400 px-2 py-0.5 bg-[var(--bg-muted)] rounded-full transition"
                >
                  🕐 {h}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 no-print">
          <button
            type="button"
            onClick={handlePrint}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition px-3 py-1.5 border border-[var(--border-primary)] rounded-lg"
          >
            🖨️ Print
          </button>

          <a
            href="https://github.com/anoopcodehack/DevBoard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition px-3 py-1.5 border border-[var(--border-primary)] rounded-lg"
          >
            {!starsLoading && stars !== null
              ? `⭐ ${formatStars(stars)} Star on GitHub`
              : "⭐ Star on GitHub"}
          </a>

          <span className="text-xs text-[var(--text-secondary)]">
            👋 {user?.name}
          </span>

          {document.fullscreenEnabled && (
            <button
              onClick={handleFullscreen}
              aria-label={
                isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
              }
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition px-3 py-1.5 border border-[var(--border-primary)] rounded-lg"
            >
              {isFullscreen ? "⊠ Exit" : "⛶ Focus"}
            </button>
          )}

          {/* <span className="text-xs text-[var(--text-secondary)]">
            👋 {getGreeting()},{user?.name}
          </span> */}

          <button
            type="button"
            onClick={() => setFocusMode((v) => !v)}
            aria-label={
              focusMode ? "Disable focus mode" : "Enable focus mode"
            }
            className={`text-xs px-3 py-1.5 rounded-lg border transition ${
              focusMode
                ? "border-purple-500 text-purple-400 bg-purple-500/10"
                : "border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {focusMode ? "🎯 Focused" : "🎯 Focus"}
          </button>

          <button
            onClick={handleClearDone}
            className="text-xs text-[var(--text-secondary)] hover:text-red-400 transition px-3 py-1.5 border border-[var(--border-primary)] rounded-lg"
          >
            🗑️ Clear Done
          </button>

          <button
            onClick={handleLogoutAll}
            className="text-xs text-[var(--text-secondary)] hover:text-red-400 transition px-3 py-1.5 border border-[var(--border-primary)] rounded-lg"
          >
            🔐 Logout All
          </button>

          <button
            onClick={() => setShowHelp((v) => !v)}
            aria-label="Keyboard shortcuts help"
            title="Keyboard shortcuts (?)"
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-muted)] px-2 py-1 border border-[var(--border-primary)] rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
          >
            ⌨️ ?
          </button>

          <span className="text-xs text-[var(--text-secondary)]">
            {isNight ? "🌙 Night mode" : "☀️ Day mode"}
          </span>

          <button
            onClick={handleLogout}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition px-3 py-1.5 border border-[var(--border-primary)] rounded-lg"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="no-print">
        <Heatmap />
      </div>

      {/* Pomodoro Bar */}
      <div className="no-print">
        <PomodoroTimer
          activeTaskTitle={selectedTask?.title}
          onSessionComplete={handleSessionComplete}
        />
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        {tasks.length === 0 ? (
          <div className="flex-1 h-full flex flex-col items-center justify-center text-center p-8">
            <span className="text-6xl mb-4">👋</span>

            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
              Welcome to your board!
            </h2>

            <p className="text-[var(--text-tertiary)] mb-6 max-w-md">
              You don't have any tasks yet. Click + Add card to create your
              first one.
            </p>

            <button
              onClick={() => setIsCreatingFirstTask(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg font-medium transition"
            >
              + Add your first card
            </button>
          </div>
        ) : (
          <KanbanBoard
            onSelectTask={handleSelectTask}
            focusMode={focusMode}
          />
        )}
      </div>

      {/* Task Edit Modal */}
      {selectedTask && (
        <TaskModal
          mode="edit"
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSave={async (data) => {
            await updateTask(selectedTask._id, data);
            setSelectedTask(null);
          }}
          updateTask={updateTask}
        />
      )}

      {/* Create First Task Modal */}
      {isCreatingFirstTask && (
        <TaskModal
          mode="create"
          defaultStatus="backlog"
          onClose={() => setIsCreatingFirstTask(false)}
          onSave={async (data) => {
            await addTask(data);
            setIsCreatingFirstTask(false);
          }}
        />
      )}

      {/* Scroll To Top Button */}
      {showTop && (
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });

            const scrollContainers = document.querySelectorAll(
              ".overflow-y-auto, .overflow-y-scroll"
            );

            scrollContainers.forEach((container) => {
              container.scrollTo({
                top: 0,
                behavior: "smooth",
              });
            });
          }}
          className="no-print fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-500 text-white rounded-full w-10 h-10 text-lg shadow-lg transition z-50 flex items-center justify-center"
          aria-label="Scroll to top"
        >
          ⬆️
        </button>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowHelp(false);
            }
          }}
        >
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)]">
              <h2 className="font-semibold text-[var(--text-primary)] text-sm">
                Keyboard Shortcuts
              </h2>

              <button
                onClick={() => setShowHelp(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xl leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-tertiary)]">
                  New task
                </span>

                <kbd className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">
                  N
                </kbd>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--text-tertiary)]">
                  Close modal
                </span>

                <kbd className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">
                  ESC
                </kbd>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--text-tertiary)]">
                  Toggle this menu
                </span>

                <kbd className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">
                  ?
                </kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
