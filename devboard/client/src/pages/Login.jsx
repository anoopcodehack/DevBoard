import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useBoard } from "../context/BoardContext";
import { LogoIcon } from "../components/common/Icons";

const Login = () => {
  const { login } = useBoard();
  const navigate = useNavigate();
  const [fade, setFade] = useState(true);

  useEffect(() => {
    document.title = "DevBoard — Sign In";
  }, []);

  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError("");

    if (isRegister && !form.name.trim()) {
      return setError("Name is required");
    }

    if (!form.email.includes("@")) {
      return setError("Enter a valid email address");
    }

    if (form.password.length < 6) {
      return setError("Password must be at least 6 characters");
    }

    if (!form.email || !form.password || (isRegister && !form.name)) {
      return setError("Please fill in all required fields");
    }

    setLoading(true);

    try {
      const endpoint = isRegister
        ? "/api/v1/auth/register"
        : "/api/v1/auth/login";

      const payload = isRegister
        ? {
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            password: form.password,
          }
        : {
            email: form.email.trim().toLowerCase(),
            password: form.password,
          };

      const { data } = await axios.post(endpoint, payload);

      setError("");

      if (isRegister) {
        setSuccess("Account created successfully. Redirecting...");
        setTimeout(() => {
          if (login) login(data);
          navigate("/", { replace: true });
        }, 1200);
      } else {
        if (login) login(data);
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Authentication failed. Please verify credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    const demoUser = {
      _id: "demo-user-1",
      name: "Alex Rivera",
      email: "alex@devboard.internal",
      token: "mock-token",
    };
    login(demoUser);
    navigate("/", { replace: true });
  };

  const toggleMode = () => {
    setFade(false);
    setTimeout(() => {
      setIsRegister((prev) => !prev);
      setError("");
      setSuccess("");
      setFade(true);
    }, 120);
  };

  return (
    <div className="min-h-screen bg-[#090a0e] bg-dev-grid flex flex-col justify-between p-6 relative overflow-hidden font-sans">
      {/* Header */}
      <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center">
            <LogoIcon className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-100">DevBoard</span>
          <span className="text-[11px] font-mono-code text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">v1.2</span>
        </div>

        <button
          onClick={handleDemoLogin}
          type="button"
          className="text-xs font-mono-code text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 px-3 py-1.5 rounded-md transition"
        >
          Explore Demo Mode →
        </button>
      </div>

      {/* Center Auth Card */}
      <div className="w-full max-w-sm mx-auto my-auto py-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
            {isRegister ? "Create developer account" : "Welcome back"}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {isRegister
              ? "Start managing tasks with code snippets and GitHub sync"
              : "Sign in to access your boards and active sprints"}
          </p>
        </div>

        <div className="bg-[#121319] border border-zinc-800/80 rounded-xl p-6 shadow-2xl shadow-black/60">
          {error && (
            <div className="mb-4 px-3 py-2 text-xs rounded-md bg-red-950/40 border border-red-500/30 text-red-300 flex items-start gap-2">
              <span className="text-red-400">✕</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 px-3 py-2 text-xs rounded-md bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className={`flex flex-col gap-3.5 transition-opacity duration-150 ${fade ? "opacity-100" : "opacity-0"}`}>
            {isRegister && (
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Linus Torvalds"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-[#0a0b0f] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Email</label>
              <input
                type="email"
                placeholder="dev@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-[#0a0b0f] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-zinc-400">Password</label>
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 transition"
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={show ? "text" : "password"}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-[#0a0b0f] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition font-mono-code"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-medium py-2.5 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20"
            >
              {loading && (
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              {isRegister ? (loading ? "Creating account..." : "Create Account") : (loading ? "Signing in..." : "Sign In")}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-zinc-800/80 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={toggleMode}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition text-center"
            >
              {isRegister ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>

            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full text-center text-xs py-2 px-3 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:text-white transition font-mono-code"
            >
              ⚡ Instant Demo Access
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-zinc-600 font-mono-code">
        DevBoard · Open source Kanban for software engineers
      </div>
    </div>
  );
};

export default Login;