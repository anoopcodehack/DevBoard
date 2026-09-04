import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // <-- 1. Import useNavigate
import { useBoard } from "../context/BoardContext";

const Login = () => {
  const { login } = useBoard();
  const navigate = useNavigate(); // <-- 2. Initialize navigate hook
  const [fade, setFade] = useState(true);

  useEffect(() => {
    document.title = "Login — DevBoard";
  }, []);

  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const handleSubmit = async () => {
    setError("");

    if (isRegister && !form.name.trim()) return setError("Name is required");
    if (!form.email.includes("@")) return setError("Enter a valid email");
    if (form.password.length < 6)
      return setError("Password must be at least 6 characters");

    if (!form.email || !form.password || (isRegister && !form.name)) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const endpoint = isRegister ? "/api/v1/auth/register" : "/api/v1/auth/login";

      const payload = isRegister
        ? {
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
          }
        : { email: form.email.trim(), password: form.password };

      const { data } = await axios.post(endpoint, payload);

      setError("");

      if (isRegister) {
        setSuccess("Account created! Welcome to DevBoard 🎉");

        setTimeout(() => {
          if (login) {
            login(data);
          }
          navigate("/", { replace: true });
        }, 2000);
      } else {
        if (login) {
          login(data);
        }
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setFade(false);
    setTimeout(() => {
      setIsRegister((prev) => !prev);
      setError("");
      setFade(true);
    }, 150);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--bg-primary)] via-[var(--bg-accent)] to-[var(--bg-primary)] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute w-72 h-72 bg-purple-600/10 rounded-full blur-3xl top-1/4 left-1/2 -translate-x-1/2" />
      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🗂️</div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">DevBoard</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Kanban built for developers
          </p>
        </div>

        <div
          className={`bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-6 flex flex-col gap-3 transition-opacity duration-150 ${
            fade ? "opacity-100" : "opacity-0"
          }`}
        >
          {isRegister && (
            <input
              type="text"
              placeholder="Your name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-purple-500"
            />
          )}

          <input
            type="email"
            placeholder="Email *"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-purple-500"
          />

          <div className="relative">
            <input
              type={show ? "text" : "password"}
              placeholder="Password *"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2.5 pr-10 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-purple-500"
            />
            <button
              type="button"
              onClick={() => setShow((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#777] hover:text-[#ccc]"
            >
              👁️
            </button>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          {success && (
            <p className="text-green-400 text-xs text-center">{success}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition disabled:opacity-40"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-4 h-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                {isRegister ? "Creating Account..." : "Signing in..."}
              </span>
            ) : isRegister ? (
              "Create Account"
            ) : (
              "Sign In"
            )}
          </button>

          {isRegister && (
            <p className="text-[10px] text-[var(--text-muted)] text-center leading-snug">
              By creating an account you agree to our{" "}
              <a href="#" className="text-purple-400 hover:underline">
                Terms of Service
              </a>
            </p>
          )}

          <button
            type="button"
            onClick={toggleMode}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition text-center mt-1"
          >
            {isRegister
              ? "Already have an account? Sign in"
              : "No account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
