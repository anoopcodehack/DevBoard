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
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [error, setError] = useState(null);
  const [activeTag, setActiveTag] = useState(null);

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("devboard_user");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
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
      const { data } = await axios.get("/api/tasks", authHeaders());
      setAllTasks(data);
    } catch (err) {
      setError("Cannot connect to server. Please try again!");
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTasks();
    } else {
      setAllTasks([]);
      setLoading(false);
    }
  }, [user]);

  // Real-time board sync via Socket.IO
  useEffect(() => {
    if (!user) {
      setOnlineUsers(0);
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
      const { data } = await axios.post("/api/tasks", taskData, authHeaders());
      setAllTasks((prev) => [...prev, data]);
    } catch (err) {
      console.error("addTask failed", err);
      throw err;
    }
  };

  const updateTask = async (id, updates) => {
    try {
      const { data } = await axios.put(
        `/api/tasks/${id}`,
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
      await axios.delete(`/api/tasks/${id}`, authHeaders());
      setAllTasks((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      console.error("deleteTask failed:", err);
      throw err;
    }
  };

  const addSnippet = async (taskId, snippet) => {
    const { data } = await axios.post(
      `/api/tasks/${taskId}/snippets`,
      snippet,
      authHeaders(),
    );
    setAllTasks((prev) => prev.map((t) => (t._id === taskId ? data : t)));
  };

  const login = (userData) => {
    // Standardize user object structure
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

  const tasks = useMemo(() => {
    let filtered = allTasks;

    // Filter by active tag if one is selected
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
        fetchTasks,
        error
      }}
    >
      {children}
    </BoardContext.Provider>
  );
};

export const useBoard = () => useContext(BoardContext);
