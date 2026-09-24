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



const CSV_HEADERS = ["Title", "Status", "Priority", "Tags", "Created"];

// Excel and Sheets treat a leading =, +, - or @ as the start of a formula, so a
// task titled "=HYPERLINK(...)" would run instead of being read. A leading
// quote keeps the text visible and defuses it. Doubling the inner quotes is
// what RFC 4180 asks for: without it a title containing " ends the field early
// and the rest of the row slides into the wrong columns.
const escapeCsvValue = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
};

const toCsv = (rows) =>
  rows.map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");

// toLocaleDateString gives a different order on every machine and Excel guesses
// at it. An ISO date is read the same way everywhere.
const formatCsvDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const isNightTime = () => {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6;
};



const THEMES = {
  purple: { name: "Purple", accent: "#7F77DD", bg: "#0f0f10" },
  rose:   { name: "Rose",   accent: "#E85D75", bg: "#140a0d" },
  forest: { name: "Forest", accent: "#27AE60", bg: "#0a110a" },
  gold:   { name: "Gold",   accent: "#F39C12", bg: "#111009" },
  ocean:  { name: "Ocean",  accent: "#2980B9", bg: "#0a0f14" },
  red:    { name: "Red",    accent: "#E74C3C", bg: "#140a0a" },
  teal:   { name: "Teal",   accent: "#1ABC9C", bg: "#081211" },
  sunset: { name: "Sunset", accent: "#E67E22", bg: "#140d08" },
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

  useEffect(() => {
  const handler = (e) => {
    if (e.target.matches('input, textarea')) return;
    if (e.key === 's' || e.key === 'S') {
      setShowActivity(v => !v);
    }
  };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

 useEffect(() => {
  const handleBeforeInstallPrompt = (event) => {
    event.preventDefault();
    setDeferredPrompt(event);
  };

  const handleAppInstalled = () => {
    setDeferredPrompt(null);
    console.log("PWA was installed");
  };

  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleAppInstalled);

  return () => {
    window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.removeEventListener("appinstalled", handleAppInstalled);
  };
}, []);

  const [focusMode, setFocusMode] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isCreatingFirstTask, setIsCreatingFirstTask] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNight, setIsNight] = useState(isNightTime());

  const [theme, setTheme] = useState(
    () => JSON.parse(localStorage.getItem("board_theme")) || "purple"
  );

  const [customColors, setCustomColors] = useState(() => {
    try {
      return (


        
        JSON.parse(localStorage.getItem("board_custom_theme")) || {
          accent: "#9B51E0",
          bg: "#121212",
        }
      );
    } catch {
      return { accent: "#9B51E0", bg: "#121212" };
    }
  });

  const activeTheme =
    theme === "custom"
      ? { name: "Custom", ...customColors }
      : THEMES[theme] || THEMES.purple;

  useEffect(() => {
    document.body.style.backgroundColor = activeTheme.bg;
    document.documentElement.style.backgroundColor = activeTheme.bg;

    document.documentElement.style.setProperty("--accent", activeTheme.accent);
    document.documentElement.style.setProperty("--accent-10", `${activeTheme.accent}1A`);
    document.documentElement.style.setProperty("--accent-15", `${activeTheme.accent}26`);
    document.documentElement.style.setProperty("--accent-20", `${activeTheme.accent}33`);
    document.documentElement.style.setProperty("--accent-30", `${activeTheme.accent}4D`);
    document.documentElement.style.setProperty("--accent-40", `${activeTheme.accent}66`);
    document.documentElement.style.setProperty("--bg", activeTheme.bg);
    document.documentElement.style.setProperty("--bg-primary", activeTheme.bg);
    document.documentElement.style.setProperty("--bg-card", activeTheme.bg);

    localStorage.setItem("board_theme", JSON.stringify(theme));
    localStorage.setItem("accent_color", activeTheme.accent);
  }, [theme, activeTheme]);

  const handleCustomColorChange = (key, value) => {
    const updated = { ...customColors, [key]: value };
    setCustomColors(updated);
    localStorage.setItem("board_custom_theme", JSON.stringify(updated));
    setTheme("custom");
  };

  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("search_history") || "[]");
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
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
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

  if (loading) {
    return (
      <div
        className="flex gap-4 p-4 min-h-screen"
        style={{ backgroundColor: activeTheme.bg }}
      >
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

const myTasks = tasks.filter(
  (t) => t.assignee?._id === user?._id
);

const completionRate =
  myTasks.length > 0
    ? Math.round(
        (myTasks.filter((t) => t.status === "done").length /
          myTasks.length) *
          100
      )
    : 0;

  const handleLogoutAll = async () => {
    if (window.confirm("Are you sure you want to logout from all devices?")) {
      try {
        await logoutAll();
      } catch (err) {
        console.error("Logout from all devices failed:", err);
      }
    }
  };

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    console.log(`Install prompt outcome: ${outcome}`);
    setDeferredPrompt(null);
  };

  const handleClearDone = async () => {
    if (window.confirm("Clear all done tasks?")) {
      const doneTasks = tasks.filter((t) => t.status === "done");
      await Promise.all(doneTasks.map((t) => deleteTask(t._id)));
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
      ...searchHistory.filter((h) => h.toLowerCase() !== trimmed.toLowerCase()),
    ].slice(0, 5);
    setSearchHistory(updated);
    localStorage.setItem("search_history", JSON.stringify(updated));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const rows = tasks.map((t) => [
      t.title,
      t.status,
      t.priority,
      t.tags?.join("; ") || "",
      formatCsvDate(t.createdAt),
    ]);
    // The BOM is what makes Excel open the file as UTF-8. Without it every
    // umlaut and emoji in a task title arrives mangled.
    const csv = `\uFEFF${toCsv([CSV_HEADERS, ...rows])}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `devboard-tasks-${formatCsvDate(Date.now())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="flex flex-col h-screen transition-colors duration-300"
      style={{ backgroundColor: activeTheme.bg }}
    >

{deferredPrompt && (
  <button
    onClick={handleInstallApp}
    className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white hover:brightness-110 transition"
  >
    Install App
  </button>
)}

      <div
        className="flex flex-col gap-3 px-5 py-3 border-b border-[var(--border-primary)] md:flex-row md:items-center md:justify-between transition-colors duration-300"
        style={{ backgroundColor: activeTheme.bg }}
      >
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-lg">🗂️</span>
          <span className="font-semibold text-[var(--accent)]">
            DevBoard
          </span>
          <span className="text-xs bg-[var(--accent-20)] text-[var(--accent)] px-2 py-0.5 rounded-full ml-1">
            beta
          </span>
          <span className="text-xs text-[var(--text-secondary)] ml-2">
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
          </span>
          {activeTag && (
            <button
              onClick={() => setActiveTag(null)}
              className="text-xs bg-[var(--accent-30)] text-[var(--accent)] px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-[var(--accent-40)] transition"
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
                if (e.key === "Enter") handleSearch(searchQuery);
              }}
              onBlur={() => handleSearch(searchQuery)}
              placeholder="Search tasks by title or tag..."
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-15)] transition"
            />
          </label>
          {searchHistory.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {searchHistory.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleSearch(h)}
                  className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] px-2 py-0.5 bg-[var(--bg-muted)] rounded-full transition"
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
            onClick={handleExportCSV}
            title={`Export the ${tasks.length} ${
              tasks.length === 1 ? "task" : "tasks"
            } currently on the board as CSV`}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition px-3 py-1.5 border border-[var(--border-primary)] rounded-lg"
          >
            📊 Export CSV
          </button>
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


         <div
  title={`${user?.name || "User"} • ${completionRate}% tasks completed`}
  className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-semibold cursor-help"
>
  {user?.name?.[0]?.toUpperCase()}
</div>


          {document.fullscreenEnabled && (
            <button
              onClick={handleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              className="text-xs text-[var(--text-secondary)] hover:text-red-400 transition px-3 py-1.5 border border-[var(--border-primary)] rounded-lg"
            >
              {isFullscreen ? "⊠ Exit" : "⛶ Focus"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setFocusMode((v) => !v)}
            aria-label={focusMode ? "Disable focus mode" : "Enable focus mode"}
            className={`text-xs px-3 py-1.5 rounded-lg border transition ${
              focusMode
                ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-10)]"
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
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-muted)] px-2 py-1 border border-[var(--border-primary)] rounded-lg focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-20)] transition"
          >
            ⌨️ ?
          </button>

          <span className="text-xs text-[var(--text-secondary)]">
            {isNight ? "🌙 Night mode" : "☀️ Day mode"}
          </span>

          <div className="flex items-center gap-1.5 ml-1 border-l border-[var(--border-primary)] pl-2">
            {Object.entries(THEMES).map(([name, t]) => (
              <button
                key={name}
                type="button"
                onClick={() => setTheme(name)}
                style={{ background: t.accent }}
                title={`${name.charAt(0).toUpperCase() + name.slice(1)} theme`}
                className={`w-4 h-4 rounded-full transition transform hover:scale-110 ${
                  theme === name ? "ring-2 ring-white scale-110" : "opacity-80"
                }`}
              />
            ))}

            <label
              title="Custom Accent Color"
              className={`cursor-pointer flex items-center rounded-full p-0.5 transition ${
                theme === "custom" ? "ring-2 ring-white" : ""
              }`}
            >
              <input
                type="color"
                value={customColors.accent}
                onChange={(e) => handleCustomColorChange("accent", e.target.value)}
                className="w-4 h-4 rounded-full border-0 p-0 cursor-pointer bg-transparent opacity-80 hover:opacity-100"
              />
            </label>
            <label
              title="Custom Background Color"
              className={`cursor-pointer flex items-center rounded-full p-0.5 transition ${
                theme === "custom" ? "ring-2 ring-white" : ""
              }`}
            >
              <input
                type="color"
                value={customColors.bg}
                onChange={(e) => handleCustomColorChange("bg", e.target.value)}
                className="w-4 h-4 rounded-full border border-white/40 p-0 cursor-pointer bg-transparent opacity-80 hover:opacity-100"
              />
            </label>
          </div>

          <button
            onClick={handleLogout}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition px-3 py-1.5 border border-[var(--border-primary)] rounded-lg"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="no-print">
        <Heatmap />
      </div>

      <div className="no-print">
        <PomodoroTimer
          activeTaskTitle={selectedTask?.title}
          onSessionComplete={handleSessionComplete}
        />
      </div>

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
              style={{ backgroundColor: activeTheme.accent }}
              className="text-white px-6 py-2.5 rounded-lg font-medium transition hover:brightness-110"
            >
              + Add your first card
            </button>
          </div>
        ) : (
          <KanbanBoard onSelectTask={setSelectedTask} focusMode={focusMode} />
        )}
      </div>

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

      {showTop && (
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            const scrollContainers = document.querySelectorAll(
              ".overflow-y-auto, .overflow-y-scroll"
            );
            scrollContainers.forEach((container) => {
              container.scrollTo({ top: 0, behavior: "smooth" });
            });
          }}
          style={{ backgroundColor: activeTheme.accent }}
          className="no-print fixed bottom-6 right-6 text-white rounded-full w-10 h-10 text-lg shadow-lg transition z-50 flex items-center justify-center hover:brightness-110"
          aria-label="Scroll to top"
        >
          ⬆️
        </button>
      )}

      {showHelp && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowHelp(false);
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
                <span className="text-[var(--text-tertiary)]">New task</span>
                <kbd className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">
                  N
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-tertiary)]">Close modal</span>
                <kbd className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">
                  ESC
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-tertiary)]">Toggle this menu</span>
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