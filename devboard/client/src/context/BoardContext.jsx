import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import { io } from "socket.io-client";

const BoardContext = createContext();

export const BoardProvider = ({ children }) => {
  const [allTasks, setAllTasks] = useState([
    {
      _id: "1",
      title: "Set up preset themes",
      description: "Allow switching between Ocean, Forest, Sunset themes",
      status: "in_progress",
      priority: "high",
      tags: ["feature", "ui"],
      pomodoroCount: 2,
    },
    {
      _id: "2",
      title: "Review PR #491",
      description: "Check UI background consistency",
      status: "backlog",
      priority: "medium",
      tags: ["review"],
      pomodoroCount: 0,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [onlineUsers, setOnlineUsers] = useState(1);
  const [error, setError] = useState(null);
  const [activeTag, setActiveTag] = useState(null);

  // Mock user fallback so login screen is bypassed without DB server
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("devboard_user");
    try {
      return saved ? JSON.parse(saved) : { id: "demo", name: "Dev User", token: "mock-token" };
    } catch {
      return { id: "demo", name: "Dev User", token: "mock-token" };
    }
  });

  // Safe Token Extractor
  const getToken = () => {
    if (!user) return null;
    return user.token || user.jwt || (typeof user === "string" ? user : null);
  };

  const authHeaders = () => {
    const token = getToken();
    return {
      headers: { Authorization: token ? `Bearer ${token}` : "" },
    };
  };

  const fetchTasks = async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data } = await axios.get("/api/v1/tasks", authHeaders());
      setAllTasks(data);
    } catch (err) {
      console.warn("Using offline mock tasks since backend server is down.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.token !== "mock-token") {
      fetchTasks();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Real-time board sync via Socket.IO
  useEffect(() => {
    if (!user || user.token === "mock-token") {
      setOnlineUsers(1);
      return;
    }

    const socket = io("http://localhost:5000");

    socket.on("users:online", setOnlineUsers);
    socket.on("disconnect", () => setOnlineUsers(0));

    socket.on("task:updated", (updatedTask) => {
      setAllTasks((prev) =>
        prev.map((t) =>
          String(t._id) === String(updatedTask._id) ? updatedTask : t,
        ),
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const addTask = async (taskData) => {
    try {
<<<<<<< HEAD
      if (user.token === "mock-token") {
        const newTask = { ...taskData, _id: Date.now().toString(), pomodoroCount: 0 };
        setAllTasks((prev) => [...prev, newTask]);
        return;
      }
      const { data } = await axios.post("/api/tasks", taskData, authHeaders());
=======
      const { data } = await axios.post("/api/v1/tasks", taskData, authHeaders());
>>>>>>> main
      setAllTasks((prev) => [...prev, data]);
    } catch (err) {
      console.error("addTask failed", err);
      if (err.response?.status === 429) {
        setError('Too many requests — slow down a bit! 🚦');
      } else {
        setError('Failed to add task. Try again!');
      }
      throw err;
    }
  };

  const updateTask = async (id, updates) => {
    try {
      if (user.token === "mock-token") {
        setAllTasks((prev) => prev.map((t) => (t._id === id ? { ...t, ...updates } : t)));
        return;
      }
      const { data } = await axios.put(
        `/api/v1/tasks/${id}`,
        updates,
        authHeaders(),
      );
      setAllTasks((prev) => prev.map((t) => (t._id === id ? data : t)));
    } catch (err) {
      console.error("updateTask failed:", err);
      throw err;
    }
  };

  const deleteTask = async (id) => {
    try {
<<<<<<< HEAD
      if (user.token === "mock-token") {
        setAllTasks((prev) => prev.filter((t) => t._id !== id));
        return;
      }
      await axios.delete(`/api/tasks/${id}`, authHeaders());
=======
      await axios.delete(`/api/v1/tasks/${id}`, authHeaders());
>>>>>>> main
      setAllTasks((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      console.error("deleteTask failed:", err);
      throw err;
    }
  };

  const addSnippet = async (taskId, snippet) => {
    if (user.token === "mock-token") return;
    const { data } = await axios.post(
      `/api/v1/tasks/${taskId}/snippets`,
      snippet,
      authHeaders(),
    );
    setAllTasks((prev) => prev.map((t) => (t._id === taskId ? data : t)));
  };

  const login = (userData) => {
    const formattedUser = userData.token
      ? userData
      : { token: userData.token || userData.jwt, ...userData };

    setUser(formattedUser);
    localStorage.setItem("devboard_user", JSON.stringify(formattedUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("devboard_user");
    setAllTasks([]);
    setSearchQuery("");
  };

  const logoutAll = async () => {
    try {
<<<<<<< HEAD
      if (user?.token !== "mock-token") {
        await axios.post("/api/auth/logout-all", {}, authHeaders());
      }
=======
      await axios.post("/api/v1/auth/logout-all", {}, authHeaders());
>>>>>>> main
      logout();
    } catch (err) {
      console.error("logoutAll failed:", err);
      throw err;
    }
  };

  const tasks = useMemo(() => {
    let filtered = allTasks;

    if (activeTag) {
      filtered = filtered.filter((task) => task.tags?.includes(activeTag));
    }

    const query = searchQuery.trim().toLowerCase();

    if (!query) return filtered;

    const priorityLabel = (priority) => {
      if (!priority) return "";
      return `${priority} priority`;
    };

    return filtered.filter((task) => {
      const title = task.title?.toLowerCase() || "";
      const description = task.description?.toLowerCase() || "";
      const tags = task.tags?.join(" ").toLowerCase() || "";
      const priority = task.priority?.toLowerCase() || "";
      const priorityText = priorityLabel(task.priority).toLowerCase();

      return (
        title.includes(query) ||
        description.includes(query) ||
        tags.includes(query) ||
        priority.includes(query) ||
        priorityText.includes(query)
      );
    });
  }, [allTasks, searchQuery, activeTag]);

  return (
    <BoardContext.Provider
      value={{
        tasks,
        allTasks,
        loading,
        user,
        onlineUsers,
        searchQuery,
        setSearchQuery,
        activeTag,
        setActiveTag,
        addTask,
        updateTask,
        deleteTask,
        addSnippet,
        login,
        logout,
        logoutAll,
        fetchTasks,
        error,
        setError,
      }}
    >
      {children}
    </BoardContext.Provider>
  );
};

export const useBoard = () => useContext(BoardContext);