import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useBoard } from "../context/BoardContext";
import {
  LogoIcon,
  GithubIcon,
  StarIcon,
  ArrowUpRightIcon,
  CheckIcon,
  XIcon,
  CodeIcon,
  TimerIcon,
  SparklesIcon,
  TerminalIcon,
  LayersIcon,
} from "../components/common/Icons";

const Login = () => {
  const { login } = useBoard();
  const navigate = useNavigate();
  const [fade, setFade] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    document.title = "DevBoard — Developer Kanban & Workspaces";
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
        }, 1000);
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
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-purple-500/20 selection:text-zinc-900 relative">
      {/* Top Main Navbar (Exact Match to Screenshot) */}
      <header className="w-full bg-white border-b border-zinc-200/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          {/* Brand Logo: Geometric black bold font with square block */}
          <div className="flex items-center gap-10">
            <a href="/" className="flex items-center gap-2 group">
              <span className="font-extrabold text-xl tracking-tight text-black uppercase font-sans">
                DEVBOARD
              </span>
              <span className="w-2.5 h-4 bg-black inline-block group-hover:scale-105 transition-transform" />
            </a>

            {/* Nav links (DevBoard's real project features) */}
            <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-600">
              <a href="#board" className="hover:text-black transition">Solutions</a>
              <a href="#snippets" className="hover:text-black transition">Docs</a>
              <a href="#sync" className="hover:text-black transition">Industries</a>
              <a href="#pomodoro" className="hover:text-black transition">Resources</a>
              <a href="#auth" className="hover:text-black transition">Pricing</a>
              <a href="#community" className="hover:text-black transition">Community</a>
            </nav>
          </div>

          {/* Right Nav Action Pills */}
          <div className="flex items-center gap-2.5">
            {/* GitHub Stars Pill */}
            <a
              href="https://github.com/anoopcodehack/DevBoard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono-code text-zinc-800 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200/80 transition"
              title="GitHub Star Count"
            >
              <GithubIcon className="w-3.5 h-3.5" />
              <span className="font-semibold">129.7K</span>
            </a>

            {/* Install Pill */}
            <button
              type="button"
              onClick={handleDemoLogin}
              className="px-4 py-1.5 rounded-full text-xs font-medium text-zinc-800 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200/80 transition"
            >
              Install
            </button>

            {/* Get a Demo / Sign In Pill */}
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="px-4 py-1.5 rounded-full text-xs font-medium text-zinc-800 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200/80 transition"
            >
              Get a demo
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-20">
        {/* The Exact Framed Hero Card (Screenshot Match) */}
        <div className="w-full rounded-2xl md:rounded-3xl p-8 sm:p-14 md:p-20 relative overflow-hidden bg-silk-iridescent silk-sheen border border-purple-200/50 shadow-xl shadow-purple-200/20 min-h-[500px] md:min-h-[580px] flex flex-col justify-center">
          
          {/* Subtle silk wave organic highlights */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 80% 50% at 75% 30%, rgba(255, 255, 255, 0.9) 0%, transparent 60%), radial-gradient(ellipse 60% 60% at 25% 75%, rgba(216, 180, 254, 0.6) 0%, transparent 60%)",
            }}
          />

          {/* Floating Announcement Pill Badge */}
          <div className="relative z-10 mb-8 sm:mb-10">
            <a
              href="#auth"
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium text-zinc-800 bg-white/80 hover:bg-white backdrop-blur-md border border-white/80 shadow-xs transition"
            >
              <span>Live webinar: Building Autonomous Agent Workflows You Can Trust, Dec 15</span>
              <ArrowUpRightIcon className="w-3.5 h-3.5 text-zinc-600" />
            </a>
          </div>

          {/* Giant Hero Headline (Exact Typography Rhythm from Screenshot) */}
          <h1 className="relative z-10 text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-zinc-950 leading-[1.08] mb-6 max-w-3xl">
            Your developers have guardrails.
            <br />
            Your AI doesn’t.
          </h1>

          {/* Subheader */}
          <p className="relative z-10 text-base sm:text-lg md:text-xl text-zinc-800/90 font-normal leading-relaxed max-w-xl mb-10">
            Safely run your favorite AI, agents, and enterprise development on your own infrastructure.
          </p>

          {/* Hero Action Pill Buttons (Exact Match to Screenshot) */}
          <div className="relative z-10 flex flex-wrap items-center gap-3">
            {/* Black Pill with Square Icon */}
            <button
              type="button"
              onClick={handleDemoLogin}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full text-sm font-medium text-white bg-black hover:bg-zinc-850 active:bg-zinc-900 transition shadow-md shadow-black/20"
            >
              <span className="w-2.5 h-2.5 bg-white inline-block" />
              <span>Install DevBoard</span>
            </button>

            {/* White Pill Button */}
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="px-6 py-3 rounded-full text-sm font-medium text-zinc-900 bg-white hover:bg-zinc-50 active:bg-zinc-100 border border-white/80 transition shadow-sm"
            >
              Start a trial
            </button>
          </div>
        </div>

        {/* DevBoard Core Features (Clean, Crisp Light Theme, NOT FULL BLACK!) */}
        <section className="mt-16 sm:mt-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-mono-code uppercase tracking-wider text-blue-600 font-semibold bg-blue-50 border border-blue-200/60 px-3 py-1 rounded-full">
              Open Source Developer Workspace
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 mt-4">
              Everything developers need to stay in flow
            </h2>
            <p className="text-sm text-zinc-500 mt-2">
              Manage engineering backlogs with embedded code snippets, bi-directional GitHub sync, and integrated focus timers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-4">
                <LayersIcon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-zinc-900 mb-1.5">Interactive Kanban</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Drag-and-drop boards with configurable column limits, swimlanes, keyboard shortcuts, and zoom controls.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center mb-4">
                <CodeIcon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-zinc-900 mb-1.5">Code Snippets</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Attach syntax-highlighted snippets directly to tasks in JavaScript, TypeScript, Python, Go, and SQL.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                <GithubIcon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-zinc-900 mb-1.5">GitHub Sync</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Import GitHub issues directly to board columns with automatic label mapping and live issue references.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center mb-4">
                <TimerIcon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-zinc-900 mb-1.5">Pomodoro Focus</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Built-in 25-minute focus intervals with ambient audio soundscapes and automatic completed task tracking.
              </p>
            </div>
          </div>
        </section>

        {/* Authentication Card (Clean White, NOT FULL BLACK!) */}
        <section id="auth" className="mt-16 sm:mt-24 max-w-md mx-auto">
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-8 shadow-xl shadow-zinc-200/40">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 mb-2">
                <span className="font-extrabold text-base tracking-tight text-black uppercase">DEVBOARD</span>
                <span className="w-2 h-3.5 bg-black inline-block" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900">
                {isRegister ? "Create Developer Account" : "Sign In to DevBoard"}
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                {isRegister
                  ? "Start managing tasks with code snippets and GitHub sync"
                  : "Access your boards, active sprints, and focus metrics"}
              </p>
            </div>

            {error && (
              <div className="mb-4 px-3.5 py-2 text-xs rounded-lg bg-red-50 border border-red-200 text-red-600 flex items-start gap-2">
                <XIcon className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 px-3.5 py-2 text-xs rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-start gap-2">
                <CheckIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              {isRegister && (
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Linus Torvalds"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3.5 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="dev@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3.5 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-zinc-700">Password</label>
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="text-[10px] text-zinc-500 hover:text-zinc-900 transition"
                  >
                    {show ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={show ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3.5 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition font-mono-code"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full bg-black hover:bg-zinc-800 text-white text-xs font-medium py-2.5 rounded-lg transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
              >
                {loading && (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {isRegister ? (loading ? "Creating account..." : "Create Account") : (loading ? "Signing in..." : "Sign In")}
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-zinc-100 flex flex-col gap-3">
              <button
                type="button"
                onClick={toggleMode}
                className="text-xs text-zinc-500 hover:text-zinc-900 transition text-center"
              >
                {isRegister ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
              </button>

              <button
                type="button"
                onClick={handleDemoLogin}
                className="w-full text-center text-xs py-2 px-3 rounded-lg border border-zinc-200 hover:border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 transition font-mono-code flex items-center justify-center gap-2"
              >
                <TerminalIcon className="w-3.5 h-3.5 text-zinc-600" />
                <span>Instant Demo Access</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Auth Modal (Triggered by 'Get a demo' / 'Start a trial') */}
      {showAuthModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAuthModal(false);
          }}
        >
          <div className="w-full max-w-sm bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 p-1 rounded-md transition"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>

            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-1.5 mb-2">
                <span className="font-extrabold text-base tracking-tight text-black uppercase">DEVBOARD</span>
                <span className="w-2 h-3.5 bg-black inline-block" />
              </div>
              <h3 className="text-base font-bold text-zinc-900">
                {isRegister ? "Create Developer Account" : "Sign In to DevBoard"}
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                {isRegister
                  ? "Start managing tasks with code snippets and GitHub sync"
                  : "Access your boards and active sprints"}
              </p>
            </div>

            {error && (
              <div className="mb-4 px-3.5 py-2 text-xs rounded-lg bg-red-50 border border-red-200 text-red-600 flex items-start gap-2">
                <XIcon className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              {isRegister && (
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Linus Torvalds"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 transition"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="dev@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 transition"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-zinc-700">Password</label>
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="text-[10px] text-zinc-500 hover:text-zinc-900 transition"
                  >
                    {show ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={show ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 transition font-mono-code"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full bg-black hover:bg-zinc-800 text-white text-xs font-medium py-2.5 rounded-lg transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
              >
                {loading && (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {isRegister ? (loading ? "Creating account..." : "Create Account") : (loading ? "Signing in..." : "Sign In")}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={toggleMode}
                className="text-xs text-zinc-500 hover:text-zinc-900 transition text-center"
              >
                {isRegister ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
              </button>

              <button
                type="button"
                onClick={handleDemoLogin}
                className="w-full text-center text-xs py-2 px-3 rounded-lg border border-zinc-200 hover:border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 transition font-mono-code flex items-center justify-center gap-2"
              >
                <TerminalIcon className="w-3.5 h-3.5 text-zinc-600" />
                <span>Instant Demo Access</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-8 px-6 text-center text-xs text-zinc-500 font-mono-code">
        DevBoard · Open source Kanban for developers with code snippets, GitHub sync & Pomodoro timer
      </footer>
    </div>
  );
};

export default Login;
