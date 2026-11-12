import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import KanbanBoard from "../components/Board/KanbanBoard";
import PomodoroTimer from "../components/Pomodoro/PomodoroTimer";
import TaskModal from "../components/Task/TaskModal";
import Heatmap from "../components/Heatmap/Heatmap";
import { useBoard } from "../context/BoardContext";
import { useGithubStars } from "../hooks/useGithubStars";
import { useXP } from "../hooks/useXP";
import { XPWidget } from "../components/common/XPWidget";
import jsPDF from "jspdf";
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
  ActivityIcon,
} from "../components/common/Icons";
import { openVisit, touchVisit } from "../utils/lastVisit";
import { timeAgo } from "../utils/timeAgo";
import {
  BoardZoomContext,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  clampZoom,
  readStoredZoom,
  storeZoom,
} from "../utils/boardZoom";

const formatStars = (n) => {
  if (n === null || n === undefined) return null;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
};

const CSV_HEADERS = ["Title", "Status", "Priority", "Tags", "Created"];

const calculateStreak = () => {
  try {
    const history = JSON.parse(
      localStorage.getItem("completion_history") || "[]",
    );
    if (!Array.isArray(history)) return 0;

    const completedDays = new Set(
      history
        .map((completion) => {
          const date = new Date(completion);
          return Number.isNaN(date.getTime())
            ? null
            : date.toISOString().slice(0, 10);
        })
        .filter(Boolean),
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
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code))
    return "rain";
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
  const priority = (
    priorityMatch?.[1] ||
    priorityMatch?.[2] ||
    "medium"
  ).toLowerCase();
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
    recentActivity,
  } = useBoard();
  const { stars, loading: starsLoading } = useGithubStars();
  const gamification = useXP();

  const calculateDebtScore = () => {
    const debtTasks = tasks.filter(t => 
      t.tags?.some(tag => 
        ['tech-debt', 'refactor', 'hack', 'fixme', 'legacy'].includes(tag.toLowerCase())
      ) && t.status !== 'done'
    );

    const score = debtTasks.reduce((acc, t) => {
      const weight = t.priority === 'high' ? 3 : t.priority === 'medium' ? 2 : 1;
      return acc + weight;
    }, 0);

    const level = score === 0 ? 'clean' 
                : score < 5 ? 'manageable' 
                : score < 10 ? 'concerning' 
                : 'critical';

    return { score, level, count: debtTasks.length };
  };

  const debt = calculateDebtScore();

  const [streak, setStreak] = useState(calculateStreak);
  const [showBurndown, setShowBurndown] = useState(false);
  const [standupCopied, setStandupCopied] = useState(false);

  // FIXED STANDUP GENERATOR
  const generateStandup = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const done = tasks.filter(t => 
      t.status === 'done' && 
      new Date(t.updatedAt) >= yesterday
    );
    const inProgress = tasks.filter(
      t => t.status === 'inprogress'
    );
    const blocked = tasks.filter(
      t => t.blockedBy?.length > 0
    );

    const standup = [
      `✅ Yesterday:\n${done.map(t => `  - Completed: ${t.title}`).join('\n') || '  - No tasks completed'}`,
      `🔄 Today:\n${inProgress.map(t => `  - Working on: ${t.title}`).join('\n') || '  - No tasks in progress'}`,
      `🚫 Blockers:\n${blocked.map(t => `  - Blocked: ${t.title}`).join('\n') || '  - No blockers'}`
    ].join('\n\n');

    navigator.clipboard.writeText(standup);
    setStandupCopied(true);
    setTimeout(() => setStandupCopied(false), 2000);
  };

  const burndownData = useMemo(() => {
    const sprintStart = activeSprint?.startDate
      ? new Date(activeSprint.startDate)
      : new Date(Date.now() - 14 * 86400000);
    const totalTasks = tasks.length;
    const days = 14;
    const maxY = Math.max(totalTasks, 1);
    const W = 300;
    const H = 100;
    const pad = 10;
    const innerW = W - pad * 2;
    const innerH = H - pad * 2;

    const idealLine = Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      ideal: Math.round(totalTasks - (totalTasks / days) * i),
    }));

    const actualLine = idealLine.map(({ day }) => {
      const date = new Date(sprintStart);
      date.setDate(date.getDate() + day);
      const remaining = tasks.filter((t) => {
        if (t.status !== "done") return true;
        const doneDate = new Date(t.updatedAt || t.createdAt || Date.now());
        return doneDate > date;
      }).length;
      return { day, actual: remaining };
    });

    const idealPoints = idealLine
      .map(
        (d, i) =>
          `${pad + (i / (days - 1)) * innerW},${pad + ((maxY - d.ideal) / maxY) * innerH}`,
      )
      .join(" ");

    const actualPoints = actualLine
      .map(
        (d, i) =>
          `${pad + (i / (days - 1)) * innerW},${pad + ((maxY - d.actual) / maxY) * innerH}`,
      )
      .join(" ");

    return { idealPoints, actualPoints };
  }, [tasks, activeSprint]);

  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const listeningRef = useRef(false);
  const voiceResultHandledRef = useRef(false);
  const voiceHandlerRef = useRef(null);

  const recordTaskCompletion = () => {
    try {
      const history = JSON.parse(
        localStorage.getItem("completion_history") || "[]",
      );
      const completions = Array.isArray(history) ? history : [];
      completions.push(new Date().toISOString());
      localStorage.setItem("completion_history", JSON.stringify(completions));
      setStreak(calculateStreak());
    } catch {
      // Keep dashboard usable if storage fails
    }
  };

  const handleTaskCompleted = (completedTask) => {
    recordTaskCompletion();
    if (completedTask) {
      gamification.awardTaskXP(completedTask);
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
        // older server without GET /me
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
        webhookHeaders,
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

  const [lastVisit] = useState(() => openVisit());

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
  const [retroCopied, setRetroCopied] = useState(false);
  const csvInputRef = useRef(null);
  const [autoThemeEnabled, setAutoThemeEnabled] = useState(
    () => localStorage.getItem("board_auto_theme") === "true",
  );
  const [timeMood, setTimeMood] = useState(() => getTimeMood());
  const [weatherCoordinates, setWeatherCoordinates] = useState(null);
  const [weatherCode, setWeatherCode] = useState(null);
  const [weatherStatus, setWeatherStatus] = useState("off");
  const weatherRequestId = useRef(0);

  const [theme, setTheme] = useState(
    () => JSON.parse(localStorage.getItem("board_theme")) || "blue",
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
    document.documentElement.style.setProperty(
      "--accent-10",
      `${activeTheme.accent}1A`,
    );
    document.documentElement.style.setProperty(
      "--accent-20",
      `${activeTheme.accent}33`,
    );
    document.documentElement.style.setProperty("--bg", activeTheme.bg);
  }, [activeTheme.accent, activeTheme.bg]);

  const [zoom, setZoom] = useState(readStoredZoom);
  const changeZoom = (next) => {
    const value = clampZoom(next);
    setZoom(value);
    storeZoom(value);
  };
  const [wideScreen, setWideScreen] = useState(
    () => window.matchMedia("(min-width: 768px)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const onChange = (e) => setWideScreen(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  const boardZoom = wideScreen ? zoom : 1;

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
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?${params}`,
          { signal: controller.signal },
        );
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
    recognition.onerror = () => {
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
    }
  };
  voiceHandlerRef.current = handleVoice;

  return (
    <div className="min-h-screen text-white bg-[var(--bg)] p-6">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">DevBoard Dashboard</h1>
          <button 
            onClick={generateStandup}
            className="px-4 py-2 bg-[var(--accent)] rounded font-semibold text-sm"
          >
            {standupCopied ? '✅ Copied!' : '🗣️ Generate Standup'}
          </button>
        </div>
        <KanbanBoard 
          tasks={tasks}
          onSelectTask={handleSelectTask}
          onTaskCompleted={handleTaskCompleted}
        />
      </div>
    </div>
  );
};

export default Dashboard;