import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import KanbanBoard from "../components/Board/KanbanBoard";
import PomodoroTimer from "../components/Pomodoro/PomodoroTimer";
import TaskModal from "../components/Task/TaskModal";
import Heatmap from "../components/Heatmap/Heatmap";
import { useBoard } from "../context/BoardContext";
import { useGithubStars } from "../hooks/useGithubStars";
import {
  LogoIcon,
  SearchIcon,
  PlusIcon,
  GithubIcon,
  StarIcon,
  TargetIcon,
  DownloadIcon,
  UploadIcon,
  PrinterIcon,
  TrashIcon,
  KeyboardIcon,
  LogoutIcon,
  FullscreenIcon,
  SparklesIcon,
  CloudIcon,
  ChevronUpIcon,
  XIcon,
  ExternalLinkIcon,
} from "../components/common/Icons";
import { openVisit, touchVisit } from "../utils/lastVisit";
import { timeAgo } from "../utils/timeAgo";

const formatStars = (n) => {
  if (n === null || n === undefined) return null;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
};

const CSV_HEADERS = ["Title", "Status", "Priority", "Tags", "Created"];

const calculateStreak = () => {
  try {
    const history = JSON.parse(localStorage.getItem("completion_history") || "[]");
    if (!Array.isArray(history)) return 0;

    const completedDays = new Set(
      history
        .map((completion) => {
          const date = new Date(completion);
          return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
        })
        .filter(Boolean)
    );
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    let date = completedDays.has(todayKey) ? today : yesterday;
    let streak = 0;

    while (completedDays.has(date.toISOString().slice(0, 10))) {
      streak += 1;
      date.setUTCDate(date.getUTCDate() - 1);
    }
    return streak;
  } catch {
    return 0;
  }
};

const escapeCsvValue = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
};

const toCsv = (rows) =>
  rows.map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");

const parseCsvRows = (text) => {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let afterQuote = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
          afterQuote = true;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (afterQuote) {
      if (char === ",") {
        row.push(field);
        field = "";
        afterQuote = false;
      } else if (char === "\n" || char === "\r") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        afterQuote = false;
        if (char === "\r" && text[i + 1] === "\n") i += 1;
      } else if (char !== " " && char !== "\t") {
        throw new Error("Unexpected text after a quoted CSV value.");
      }
      continue;
    }

    if (char === '"') {
      if (field.length > 0) throw new Error("Unexpected quote in a CSV value.");
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      if (char === "\r" && text[i + 1] === "\n") i += 1;
    } else {
      field += char;
    }
  }

  if (inQuotes) throw new Error("The CSV has an unclosed quoted value.");
  if (field.length > 0 || row.length > 0 || afterQuote) {
    row.push(field);
    rows.push(row);
  }

  return rows;
};

const VALID_STATUSES = new Set(["backlog", "inprogress", "review", "done"]);
const VALID_PRIORITIES = new Set(["low", "medium", "high"]);

const formatCsvDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const THEMES = {
  blue: { name: "Blue", accent: "#3b82f6", bg: "#090a0e" },
  indigo: { name: "Indigo", accent: "#6366f1", bg: "#090a10" },
  purple: { name: "Purple", accent: "#8b5cf6", bg: "#0a0912" },
  emerald: { name: "Emerald", accent: "#10b981", bg: "#070e0b" },
  amber: { name: "Amber", accent: "#f59e0b", bg: "#0f0d07" },
  rose: { name: "Rose", accent: "#f43f5e", bg: "#10080b" },
  cyan: { name: "Cyan", accent: "#06b6d4", bg: "#060e12" },
};

const MOOD_THEMES = {
  sunrise: { name: "Morning", accent: "#F39C12", bg: "#110e08" },
  focus: { name: "Focus time", accent: "#2980B9", bg: "#080f14" },
  evening: { name: "Evening", accent: "#E85D75", bg: "#14080c" },
  night: { name: "Night mode", accent: "#7F77DD", bg: "#0f0f10" },
};

const getTimeMood = (hour = new Date().getHours()) => {
  if (hour >= 5 && hour < 10) return "sunrise";
  if (hour >= 10 && hour < 17) return "focus";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
};

const getWeatherMood = (code) => {
  if ([0, 1].includes(code)) return "clear";
  if ([2, 3, 45, 48].includes(code)) return "cloudy";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 97, 99].includes(code)) return "storm";
  return null;
};

const WEATHER_ACCENTS = {
  clear: "#FBBF24",
  cloudy: "#94A3B8",
  rain: "#38BDF8",
  snow: "#BAE6FD",
  storm: "#A78BFA",
};

const parseVoiceTask = (transcript) => {
  const priorityMatch = transcript.match(
    /(?:\b(?:with|as)\s+)?\b(high|medium|low)\s+priority\b|\bpriority\s+(high|medium|low)\b/i,
  );
  const priority = (priorityMatch?.[1] || priorityMatch?.[2] || "medium").toLowerCase();
  const title = transcript
    .replace(
      /(?:\b(?:with|as)\s+)?\b(?:high|medium|low)\s+priority\b|\bpriority\s+(?:high|medium|low)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .replace(/[,\s;:.!?]+$/, "")
    .trim();

  return { title, priority };
};

const Dashboard = () => {
  const {
    user,
    activeSprint,
    logout,
    logoutAll,
    updateTask,
    deleteTask,
    loading,
    searchQuery,
    setSearchQuery,
    tasks,
    addTask,
    viewTask,
    activeTag,
    setActiveTag,
  } = useBoard();
  const { stars, loading: starsLoading } = useGithubStars();
  const [streak, setStreak] = useState(calculateStreak);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const listeningRef = useRef(false);
  const voiceResultHandledRef = useRef(false);
  const voiceHandlerRef = useRef(null);

  const recordTaskCompletion = () => {
    try {
      const history = JSON.parse(localStorage.getItem("completion_history") || "[]");
      const completions = Array.isArray(history) ? history : [];
      completions.push(new Date().toISOString());
      localStorage.setItem("completion_history", JSON.stringify(completions));
      setStreak(calculateStreak());
    } catch {
      // Keep the dashboard usable when browser storage is unavailable.
    }
  };

  const [showWebhookSettings, setShowWebhookSettings] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookLoaded, setWebhookLoaded] = useState(false);

  const webhookHeaders = {
    headers: { Authorization: user?.token ? `Bearer ${user.token}` : "" },
  };

  const openWebhookSettings = async () => {
    setShowWebhookSettings(true);
    if (!webhookLoaded) {
      try {
        const { data } = await axios.get("/api/v1/auth/me", webhookHeaders);
        setWebhookUrl(data?.webhookUrl || "");
      } catch {
        // older server without GET /me: start with an empty input
      }
      setWebhookLoaded(true);
    }
  };

  const handleSaveWebhook = async () => {
    setWebhookSaving(true);
    try {
      await axios.put(
        "/api/v1/auth/profile",
        { webhookUrl: webhookUrl.trim() },
        webhookHeaders
      );
      toast.success("Webhook URL saved");
    } catch {
      toast.error("Could not save the webhook URL");
    } finally {
      setWebhookSaving(false);
    }
  };

  const [countAnim, setCountAnim] = useState(false);
  const prevCount = useRef(tasks.length);

  useEffect(() => {
    if (prevCount.current !== tasks.length) {
      setCountAnim(true);

      const timer = setTimeout(() => {
        setCountAnim(false);
      }, 400);

      prevCount.current = tasks.length;

      return () => clearTimeout(timer);
    }
  }, [tasks.length]);

  const handleSelectTask = async (task) => {
    setSelectedTask(task);
    try {
      const viewedTask = await viewTask(task._id);
      if (viewedTask) setSelectedTask(viewedTask);
    } catch (err) {
      console.error("Failed to record task view:", err);
    }
  };

  useEffect(() => {
    document.title = "DevBoard — Developer Kanban";
  }, []);

  // Read once, before anything moves the stamps, so this holds the session
  // before this one rather than the one that just started.
  const [lastVisit] = useState(() => openVisit());

  // Keep the board marked as seen while it is open, otherwise a long session
  // would count as a gap the moment you reload at the end of it.
  useEffect(() => {
    const id = setInterval(touchVisit, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const [focusMode, setFocusMode] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isCreatingFirstTask, setIsCreatingFirstTask] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const csvInputRef = useRef(null);
  const [autoThemeEnabled, setAutoThemeEnabled] = useState(
    () => localStorage.getItem("board_auto_theme") === "true"
  );
  const [timeMood, setTimeMood] = useState(() => getTimeMood());
  const [weatherCoordinates, setWeatherCoordinates] = useState(null);
  const [weatherCode, setWeatherCode] = useState(null);
  const [weatherStatus, setWeatherStatus] = useState("off");
  const weatherRequestId = useRef(0);

  const [theme, setTheme] = useState(
    () => JSON.parse(localStorage.getItem("board_theme")) || "blue"
  );

  const moodTheme = MOOD_THEMES[timeMood] || MOOD_THEMES.night;
  const weatherMood = getWeatherMood(weatherCode);
  const activeTheme = autoThemeEnabled
    ? {
        ...moodTheme,
        accent: WEATHER_ACCENTS[weatherMood] || moodTheme.accent,
      }
    : THEMES[theme] || THEMES.blue;

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", activeTheme.accent);
    document.documentElement.style.setProperty("--accent-10", `${activeTheme.accent}1A`);
    document.documentElement.style.setProperty("--accent-20", `${activeTheme.accent}33`);
    document.documentElement.style.setProperty("--bg", activeTheme.bg);
  }, [activeTheme.accent, activeTheme.bg]);

  useEffect(() => {
    localStorage.setItem("board_theme", JSON.stringify(theme));
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("board_auto_theme", String(autoThemeEnabled));
  }, [autoThemeEnabled]);

  useEffect(() => {
    if (!autoThemeEnabled) return undefined;

    const updateTimeMood = () => setTimeMood(getTimeMood());
    updateTimeMood();
    const interval = setInterval(updateTimeMood, 60 * 1000);
    return () => clearInterval(interval);
  }, [autoThemeEnabled]);

  useEffect(() => {
    if (!autoThemeEnabled || !weatherCoordinates) return undefined;

    let cancelled = false;
    const controller = new AbortController();
    const loadWeather = async () => {
      setWeatherStatus("loading");
      try {
        const params = new URLSearchParams({
          latitude: String(weatherCoordinates.latitude),
          longitude: String(weatherCoordinates.longitude),
          current: "weather_code",
          timezone: "auto",
        });
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Weather request failed");

        const data = await response.json();
        if (!cancelled && Number.isFinite(data.current?.weather_code)) {
          setWeatherCode(data.current.weather_code);
          setWeatherStatus("ready");
        } else if (!cancelled) {
          setWeatherStatus("unavailable");
        }
      } catch {
        if (!cancelled) {
          setWeatherCode(null);
          setWeatherStatus("unavailable");
        }
      }
    };

    loadWeather();
    const interval = setInterval(loadWeather, 30 * 60 * 1000);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(interval);
    };
  }, [autoThemeEnabled, weatherCoordinates]);

  const handleToggleAutoTheme = () => {
    const nextEnabled = !autoThemeEnabled;
    setAutoThemeEnabled(nextEnabled);
    if (!nextEnabled) {
      weatherRequestId.current += 1;
      setWeatherCoordinates(null);
      setWeatherCode(null);
      setWeatherStatus("off");
    }
  };

  const handleUseLocalWeather = () => {
    if (!navigator.geolocation) {
      setWeatherStatus("unavailable");
      return;
    }

    setWeatherStatus("requesting");
    const requestId = ++weatherRequestId.current;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (requestId !== weatherRequestId.current) return;
        setWeatherCoordinates({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
      },
      () => {
        if (requestId !== weatherRequestId.current) return;
        setWeatherCode(null);
        setWeatherStatus("unavailable");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 30 * 60 * 1000 },
    );
  };

  const handleSelectManualTheme = (name) => {
    weatherRequestId.current += 1;
    setTheme(name);
    setAutoThemeEnabled(false);
    setWeatherCoordinates(null);
    setWeatherCode(null);
    setWeatherStatus("off");
  };

  const handleVoice = () => {
    if (listeningRef.current) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice task creation is not supported by this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    listeningRef.current = true;
    voiceResultHandledRef.current = false;

    recognition.onstart = () => setListening(true);
    recognition.onresult = async (event) => {
      if (voiceResultHandledRef.current) return;
      voiceResultHandledRef.current = true;

      const transcript = Array.from(event.results)
        .filter((result) => result.isFinal)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();

      if (!transcript) {
        toast.warn("I couldn't hear a task. Try speaking again.");
        return;
      }

      const task = parseVoiceTask(transcript);
      if (!task.title) {
        toast.warn("Please say a task title along with its priority.");
        return;
      }

      try {
        await addTask({ ...task, status: "backlog" });
        toast.success(`Created task: ${task.title}`);
      } catch (error) {
        console.error("Voice task creation failed:", error);
        toast.error("Could not create the voice task.");
      }
    };
    recognition.onerror = (event) => {
      if (event.error !== "aborted") {
        toast.error(
          event.error === "not-allowed" || event.error === "service-not-allowed"
            ? "Allow microphone access to create tasks by voice."
            : "Voice recognition failed. Please try again.",
        );
      }
      listeningRef.current = false;
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.onend = () => {
      listeningRef.current = false;
      setListening(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
    } catch (error) {
      listeningRef.current = false;
      setListening(false);
      recognitionRef.current = null;
      console.error("Could not start voice recognition:", error);
      toast.error("Could not start voice recognition. Please try again.");
    }
  };
  voiceHandlerRef.current = handleVoice;

  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("search_history") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handler = (e) => {
      const target = e.target;
      const isTypingTarget =
        target instanceof HTMLElement &&
        target.matches(
          "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='textbox'], button, a, [role='button']",
        );

      if (
        e.code === "Space" &&
        !e.repeat &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !isTypingTarget &&
        !listeningRef.current
      ) {
        e.preventDefault();
        voiceHandlerRef.current?.();
        return;
      }

      if (isTypingTarget) return;
      if (e.key === "n" || e.key === "N") {
        setIsCreatingFirstTask(true);
      }
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        setShowHelp((v) => !v);
      }
      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        document.getElementById("board-search-input")?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    const handleScroll = (event) => {
      let scrollTop = 0;
      if (event.target === document || event.target === window) {
        scrollTop = window.scrollY;
      } else if (event.target) {
        scrollTop = event.target.scrollTop;
      }
      setShowTop(scrollTop > 200);
    };
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, []);

  const handleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.warn("Fullscreen toggle failed:", error);
    }
  };

  const handleLogout = () => {
    if (window.confirm("Sign out of DevBoard?")) {
      logout();
    }
  };

  const handleClearDone = async () => {
    if (window.confirm("Archive all completed tasks?")) {
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

  const handleExportCSV = () => {
    const rows = tasks.map((t) => [
      t.title,
      t.status,
      t.priority,
      t.tags?.join("; ") || "",
      formatCsvDate(t.createdAt),
    ]);
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

  const handleImportCSV = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Choose a .csv file to import.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("CSV files must be smaller than 5 MB.");
      return;
    }

    setIsImporting(true);
    try {
      const text = (await file.text()).replace(/^\uFEFF/, "");
      const rows = parseCsvRows(text);
      const nonEmptyRows = rows.filter((cells) => cells.some((cell) => cell.trim()));
      if (nonEmptyRows.length < 2) {
        throw new Error("The CSV must include a header row and at least one task.");
      }

      const headers = nonEmptyRows[0].map((header) => header.trim().toLowerCase());
      const titleIndex = headers.indexOf("title");
      if (titleIndex === -1) {
        throw new Error('The CSV needs a "Title" column. Export a DevBoard CSV for the supported format.');
      }

      const statusIndex = headers.indexOf("status");
      const priorityIndex = headers.indexOf("priority");
      const tagsIndex = headers.indexOf("tags");
      const candidates = [];
      const invalidRows = [];

      nonEmptyRows.slice(1).forEach((cells, index) => {
        const rowNumber = index + 2;
        const title = (cells[titleIndex] || "").trim();
        const status = statusIndex === -1
          ? "backlog"
          : (cells[statusIndex] || "backlog").trim().toLowerCase() || "backlog";
        const priority = priorityIndex === -1
          ? "medium"
          : (cells[priorityIndex] || "medium").trim().toLowerCase() || "medium";

        if (!title) {
          invalidRows.push(`row ${rowNumber}: title is required`);
        } else if (!VALID_STATUSES.has(status)) {
          invalidRows.push(`row ${rowNumber}: invalid status "${status}"`);
        } else if (!VALID_PRIORITIES.has(priority)) {
          invalidRows.push(`row ${rowNumber}: invalid priority "${priority}"`);
        } else {
          candidates.push({
            rowNumber,
            task: {
              title,
              status,
              priority,
              tags: tagsIndex === -1
                ? []
                : (cells[tagsIndex] || "").split(";").map((tag) => tag.trim()).filter(Boolean),
            },
          });
        }
      });

      if (!candidates.length) {
        throw new Error(invalidRows[0] || "No valid tasks were found in this CSV.");
      }

      let importedCount = 0;
      const failedRows = [];
      for (const { rowNumber, task } of candidates) {
        try {
          await addTask(task);
          importedCount += 1;
        } catch {
          failedRows.push(`row ${rowNumber}: could not be saved`);
        }
      }

      const skippedCount = invalidRows.length + failedRows.length;
      if (importedCount) {
        toast.success(`Imported ${importedCount} task${importedCount === 1 ? "" : "s"}.`);
      }
      if (skippedCount) {
        const firstIssue = invalidRows[0] || failedRows[0];
        toast.warn(`${skippedCount} row${skippedCount === 1 ? " was" : "s were"} skipped. ${firstIssue}`);
      }
    } catch (error) {
      toast.error(error.message || "Could not read this CSV file.");
    } finally {
      setIsImporting(false);
    }
  };

  const myTasks = tasks.filter((t) => t.assignee?._id === user?._id);
  const completionRate =
    myTasks.length > 0
      ? Math.round(
        (myTasks.filter((t) => t.status === "done").length / myTasks.length) * 100
      )
      : 0;
  const daysRemaining = activeSprint
    ? Math.max(
        0,
        Math.ceil(
          (new Date(activeSprint.endDate).getTime() - Date.now()) / 86400000,
        ),
      )
    : 0;

  if (loading) {
    return (
      <div className="flex gap-4 p-6 min-h-screen bg-[#090a0e]">
        {[1, 2, 3, 4].map((col) => (
          <div key={col} className="flex flex-col w-72 gap-3">
            <div className="h-9 bg-zinc-900 rounded-lg animate-pulse" />
            {[1, 2, 3].map((card) => (
              <div key={card} className="animate-pulse bg-zinc-900/60 border border-zinc-800 rounded-lg h-28 w-full" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--bg)] text-zinc-100 font-sans overflow-hidden">
      {/* Top Navbar */}
      <header className="flex flex-col md:flex-row items-stretch md:items-center justify-between px-4 py-2.5 bg-[#0b0c11] border-b border-zinc-800/80 gap-3 shrink-0 z-20">
        {/* Left: Brand & Stats */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center">
              <LogoIcon className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-zinc-100">DevBoard</span>
            <span className="text-[10px] font-mono-code text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-0.2 rounded">v1.2</span>
          </div>

          <div className="h-4 w-[1px] bg-zinc-800" />

          <span className={`inline-block text-xs font-mono-code transition-all duration-300 ${
                  countAnim? "scale-125 text-purple-400": "text-zinc-400"}`}>
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
          </span>
          {lastVisit && (
            <span
              title={`You last opened this board on ${new Date(lastVisit).toLocaleString()}`}
              className="text-xs font-mono-code text-zinc-500 no-print"
            >
              last visit {timeAgo(lastVisit)}
            </span>
          )}
          {streak > 0 && <span className="text-xs font-mono-code text-orange-300">🔥 {streak} day streak</span>}

          {activeTag && (
            <button
              onClick={() => setActiveTag(null)}
              className="text-[11px] font-mono-code bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-md flex items-center gap-1.5 hover:bg-blue-500/25 transition"
            >
              <span>#{activeTag}</span>
              <XIcon className="w-3 h-3 text-blue-400" />
            </button>
          )}
        </div>

        {/* Center: Search & Filter */}
        <div className="flex-1 max-w-xl mx-auto w-full no-print">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
              <SearchIcon className="w-3.5 h-3.5" />
            </div>
            <input
              id="board-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch(searchQuery);
              }}
              onBlur={() => handleSearch(searchQuery)}
              placeholder="Search tasks, code, or tags..."
              className="w-full bg-[#111218] border border-zinc-800/90 rounded-lg pl-9 pr-8 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition font-mono-code"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#aaa] transition text-xs"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
            {!searchQuery && (
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                <kbd className="text-[10px] font-mono-code text-zinc-500 bg-zinc-900 border border-zinc-800 px-1 rounded">
                  /
                </kbd>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions, GitHub, User Profile */}
        <div className="flex items-center gap-2 shrink-0 no-print">
          {/* GitHub Stars */}
          <a
            href="https://github.com/anoopcodehack/DevBoard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-mono-code text-zinc-300 hover:text-zinc-100 bg-zinc-900/80 hover:bg-zinc-850 px-2.5 py-1.5 rounded-lg border border-zinc-800 transition"
            title="Star DevBoard on GitHub"
          >
            <GithubIcon className="w-3.5 h-3.5 text-zinc-400" />
            <StarIcon className="w-3 h-3 text-amber-400" />
            {!starsLoading && stars !== null ? (
              <span>{formatStars(stars)}</span>
            ) : (
              <span>Star</span>
            )}
          </a>

          {/* Quick New Task Button */}
          <button
            type="button"
            onClick={() => setIsCreatingFirstTask(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 px-3 py-1.5 rounded-lg shadow-sm shadow-blue-500/20 transition font-mono-code"
            title="Create new task (N)"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>

          <button
            type="button"
            onClick={handleVoice}
            aria-label={listening ? "Stop voice task recording" : "Create task with voice"}
            aria-pressed={listening}
            className={`text-lg transition ${listening ? "text-red-400 animate-pulse" : "text-[#555] hover:text-[#aaa]"}`}
            title={listening ? "Stop voice recording" : "Create task with voice (Space)"}
          >
            🎤
          </button>

          {/* Focus Mode */}
          <button
            type="button"
            onClick={() => setFocusMode((v) => !v)}
            title={focusMode ? "Disable focus mode" : "Focus mode (hide completed)"}
            className={`p-1.5 rounded-lg border text-xs transition ${focusMode
                ? "bg-blue-500/10 border-blue-500 text-blue-400"
                : "border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
          >
            <TargetIcon className="w-3.5 h-3.5" />
          </button>

          {/* CSV import and export */}
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleImportCSV}
            className="hidden"
            aria-label="Choose a CSV file to import tasks"
          />
          <button
            type="button"
            onClick={() => csvInputRef.current?.click()}
            disabled={isImporting}
            title="Import tasks from CSV"
            aria-label="Import tasks from CSV"
            className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition disabled:opacity-50"
          >
            <UploadIcon className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            title="Export tasks as CSV"
            className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
          </button>

          {/* Clear Done */}
          <button
            type="button"
            onClick={handleClearDone}
            title="Archive completed tasks"
            className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 transition"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>

          {/* Shortcuts Help */}
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            title="Keyboard shortcuts (?)"
            className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition"
          >
            <KeyboardIcon className="w-3.5 h-3.5" />
          </button>

          {/* Outgoing Webhook Settings */}
          <button
            type="button"
            onClick={openWebhookSettings}
            title="Outgoing webhook settings (Zapier / n8n)"
            className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition"
          >
            <ExternalLinkIcon className="w-3.5 h-3.5" />
          </button>

          {/* Theme Palette Dots */}
          <div className="hidden lg:flex items-center gap-1 pl-1 border-l border-zinc-800">
            {Object.entries(THEMES).map(([name, t]) => (
              <button
                key={name}
                type="button"
                onClick={() => handleSelectManualTheme(name)}
                style={{ backgroundColor: t.accent }}
                title={`${t.name} theme`}
                className={`w-3 h-3 rounded-full transition-transform ${!autoThemeEnabled && theme === name ? "ring-2 ring-white scale-110" : "opacity-60 hover:opacity-100"
                  }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleToggleAutoTheme}
            aria-label={autoThemeEnabled ? "Disable automatic time-based theme" : "Enable automatic time-based theme"}
            aria-pressed={autoThemeEnabled}
            title={autoThemeEnabled ? `Auto theme: ${moodTheme.name}${weatherMood ? ` · ${weatherMood} weather` : " · time only"}` : "Automatically change the theme based on time of day"}
            className={`p-1.5 rounded-lg border transition ${autoThemeEnabled
              ? "border-[var(--accent)] bg-[var(--accent-10)] text-[var(--accent)]"
              : "border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
          >
            <SparklesIcon className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleUseLocalWeather}
            disabled={!autoThemeEnabled || weatherStatus === "requesting" || weatherStatus === "loading"}
            aria-label="Use local weather in automatic theme"
            title={!autoThemeEnabled
              ? "Enable automatic theme first to use local weather"
              : weatherStatus === "ready"
                ? "Refresh weather theme using your approximate location"
                : weatherStatus === "unavailable"
                  ? "Weather unavailable. Click to retry, or keep using the time-based theme"
                  : "Use current local weather (your approximate location is sent to Open-Meteo)"}
            className={`p-1.5 rounded-lg border transition disabled:opacity-40 disabled:cursor-not-allowed ${weatherStatus === "ready"
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
          >
            <CloudIcon className="w-3.5 h-3.5" />
          </button>

          {weatherStatus === "ready" && (
            <span className="text-[9px] text-zinc-500 whitespace-nowrap">
              Weather by{" "}
              <a
                href="https://open-meteo.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-zinc-300"
              >
                Open-Meteo
              </a>
            </span>
          )}

          <div className="h-4 w-[1px] bg-zinc-800 hidden md:block" />

          {/* User Avatar & Logout */}
          <div className="flex items-center gap-2">
            <div
              title={`${user?.name || "User"} (${completionRate}% completed)`}
              className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold font-mono-code border border-zinc-800 cursor-help"
            >
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition"
            >
              <LogoutIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {activeSprint && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/5 border-b border-blue-500/15 text-xs font-mono-code">
          <span aria-hidden="true">🏃</span>
          <span className="font-medium text-blue-300">{activeSprint.name}</span>
          <span className="text-zinc-500">·</span>
          <span className="text-zinc-400">
            {daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining
          </span>
        </div>
      )}

      {/* Heatmap Section */}
      <div className="no-print">
        <Heatmap />
      </div>

      {/* Pomodoro Timer Bar */}
      <div className="no-print">
        <PomodoroTimer
          activeTaskTitle={selectedTask?.title}
          onSessionComplete={handleSessionComplete}
        />
      </div>

      {/* Main Kanban Workspace */}
      <main className="flex-1 overflow-hidden relative">
        <KanbanBoard onSelectTask={setSelectedTask} focusMode={focusMode} onTaskCompleted={recordTaskCompletion} />
      </main>

      {/* Edit Modal */}
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

      {/* Create Modal */}
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

      {/* Scroll to Top */}
      {showTop && (
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            const scrollContainers = document.querySelectorAll(
              ".overflow-y-auto, .overflow-y-scroll, .board"
            );
            scrollContainers.forEach((container) => {
              container.scrollTo({ top: 0, behavior: "smooth" });
            });
          }}
          className="no-print fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-500 text-white rounded-lg p-2.5 shadow-xl transition z-50 border border-blue-400/30 shadow-blue-500/20"
          aria-label="Scroll to top"
        >
          <ChevronUpIcon className="w-4 h-4" />
        </button>
      )}

      {/* Outgoing Webhook Settings Modal */}
      {showWebhookSettings && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowWebhookSettings(false);
          }}
        >
          <div className="bg-[#121319] border border-zinc-800 rounded-xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <ExternalLinkIcon className="w-4 h-4 text-blue-400" />
                <h3 className="font-semibold text-zinc-100 text-xs uppercase tracking-wider font-mono-code">
                  Outgoing Webhook
                </h3>
              </div>
              <button
                onClick={() => setShowWebhookSettings(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <label
                htmlFor="webhook-url"
                className="text-xs text-zinc-400 font-mono-code"
              >
                Webhook URL
              </label>
              <input
                id="webhook-url"
                type="url"
                placeholder="Webhook URL (optional)"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-600 font-mono-code"
              />
              <p className="text-[10px] text-zinc-500 leading-relaxed font-mono-code">
                DevBoard POSTs <span className="text-zinc-400">{"{ event, task, timestamp }"}</span> to this
                URL when one of your tasks is updated. Use it with Zapier, n8n or
                your own endpoint. Leave empty to turn it off.
              </p>
              <button
                type="button"
                onClick={handleSaveWebhook}
                disabled={webhookSaving}
                className="self-end text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 px-3 py-1.5 rounded-lg shadow-sm shadow-blue-500/20 transition font-mono-code disabled:opacity-50"
              >
                {webhookSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showHelp && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowHelp(false);
          }}
        >
          <div className="bg-[#121319] border border-zinc-800 rounded-xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <KeyboardIcon className="w-4 h-4 text-blue-400" />
                <h3 className="font-semibold text-zinc-100 text-xs uppercase tracking-wider font-mono-code">
                  Keyboard Shortcuts
                </h3>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-3 text-xs font-mono-code">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Create new task</span>
                <kbd className="bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded text-zinc-200">N</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Create task with voice</span>
                <kbd className="bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded text-zinc-200">Space</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Search tasks</span>
                <kbd className="bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded text-zinc-200">/</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Move between tasks</span>
                <kbd className="bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded text-zinc-200">←↑↓→</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Open focused task</span>
                <kbd className="bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded text-zinc-200">Enter</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Close modal</span>
                <kbd className="bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded text-zinc-200">ESC</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Toggle shortcuts help</span>
                <kbd className="bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded text-zinc-200">?</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
