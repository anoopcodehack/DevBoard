import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useBoard } from "../context/BoardContext";
import {
  ActivityIcon,
  CpuIcon,
  ServerIcon,
  LayersIcon,
  CheckIcon,
  ClockIcon,
  ArrowRightIcon,
  VSCodeIcon,
  ClaudeIcon,
  GoIcon,
  ZedIcon,
} from "../components/common/Icons";

const Analytics = () => {
  const { allTasks = [] } = useBoard();

  const completedTasks = useMemo(
    () =>
      allTasks.filter(
        (task) => task.status === "done" || task.status === "completed"
      ),
    [allTasks]
  );

  const weeklyData = useMemo(() => {
    const weeks = {};

    completedTasks.forEach((task) => {
      if (!task.updatedAt) return;

      const date = new Date(task.updatedAt);
      if (Number.isNaN(date.getTime())) return;

      const weekStart = new Date(date);
      weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      const key = weekStart.toISOString().slice(0, 10);

      weeks[key] = (weeks[key] || 0) + 1;
    });

    return Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([week, count]) => ({
        week,
        count,
        label: new Date(`${week}T00:00:00`).toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
        }),
      }));
  }, [allTasks, completedTasks]);

  const priorityData = useMemo(() => {
    return ["high", "medium", "low"].map((priority) => {
      const tasks = completedTasks.filter(
        (task) => task.priority?.toLowerCase() === priority
      );

      const durations = tasks
        .filter((task) => task.createdAt && task.updatedAt)
        .map((task) => {
          const created = new Date(task.createdAt).getTime();
          const updated = new Date(task.updatedAt).getTime();
          return updated - created;
        })
        .filter((duration) => Number.isFinite(duration) && duration >= 0);

      const average =
        durations.length > 0
          ? durations.reduce((sum, duration) => sum + duration, 0) /
            durations.length
          : null;

      return { priority, average, count: durations.length };
    });
  }, [allTasks, completedTasks]);

  const maxWeeklyCount = Math.max(1, ...weeklyData.map((week) => week.count));

  const formatDuration = (milliseconds) => {
    const hours = milliseconds / (1000 * 60 * 60);

    if (hours < 24) return `${hours.toFixed(1)} hours`;

    return `${(hours / 24).toFixed(1)} days`;
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-zinc-900 p-5 md:p-8 font-sans selection:bg-purple-500/20 selection:text-zinc-900">
      <div className="max-w-6xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-zinc-200">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-extrabold text-sm tracking-tight text-black uppercase">DEVBOARD</span>
              <span className="w-1.5 h-3 bg-black inline-block" />
              <span className="text-xs text-zinc-500 font-mono-code ml-1">/ Telemetry & Insights</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
              System & Workspace Analytics
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Real-time engineering throughput, cycle times, and workspace infrastructure metrics.
            </p>
          </div>

          <Link
            to="/"
            className="self-start sm:self-center px-4 py-2 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-800 transition shadow-xs font-mono-code"
          >
            ← Back to Board
          </Link>
        </div>

        {/* Live Infrastructure Telemetry Cards */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono-code text-zinc-600 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <ServerIcon className="w-3.5 h-3.5 text-zinc-600" />
              <span>Workspace Infrastructure Telemetry</span>
            </span>
            <span className="text-[11px] font-mono-code text-emerald-600 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>All systems nominal</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-zinc-200 shadow-xs">
              <span className="text-[10px] text-zinc-500 uppercase font-mono-code">CPU Usage</span>
              <p className="text-xs font-mono-code text-zinc-900 font-semibold mt-1">0.201 cores</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-zinc-200 shadow-xs">
              <span className="text-[10px] text-zinc-500 uppercase font-mono-code">RAM Usage</span>
              <p className="text-xs font-mono-code text-emerald-600 font-semibold mt-1">0.903/32 GiB (3%)</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-zinc-200 shadow-xs">
              <span className="text-[10px] text-zinc-500 uppercase font-mono-code">Host CPU</span>
              <p className="text-xs font-mono-code text-emerald-600 font-semibold mt-1">6.87/64 (11%)</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-zinc-200 shadow-xs">
              <span className="text-[10px] text-zinc-500 uppercase font-mono-code">Swap Usage</span>
              <p className="text-xs font-mono-code text-zinc-900 font-semibold mt-1">4.6/8.0 GiB</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-zinc-200 shadow-xs">
              <span className="text-[10px] text-zinc-500 uppercase font-mono-code">Load Average</span>
              <p className="text-xs font-mono-code text-zinc-900 font-semibold mt-1">0.08</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-zinc-200 shadow-xs">
              <span className="text-[10px] text-zinc-500 uppercase font-mono-code">Disk Storage</span>
              <p className="text-xs font-mono-code text-zinc-900 font-semibold mt-1">2597/3050 GiB</p>
            </div>
          </div>
        </div>

        {/* High-Level Overview Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-6 rounded-2xl border border-zinc-200 bg-white shadow-xs">
            <span className="text-xs font-mono-code text-zinc-500">Total Completed Tasks</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-zinc-900 font-mono-code">{completedTasks.length}</span>
              <span className="text-xs text-emerald-600 font-mono-code font-medium">tasks archived</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-zinc-200 bg-white shadow-xs">
            <span className="text-xs font-mono-code text-zinc-500">Active Board Load</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-zinc-900 font-mono-code">{allTasks.length - completedTasks.length}</span>
              <span className="text-xs text-blue-600 font-mono-code font-medium">in backlog & progress</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-zinc-200 bg-white shadow-xs">
            <span className="text-xs font-mono-code text-zinc-500">Active Developer Workspaces</span>
            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-center gap-1.5">
                <VSCodeIcon className="w-4 h-4 text-blue-600" />
                <ClaudeIcon className="w-4 h-4 text-amber-600" />
                <GoIcon className="w-4 h-4 text-cyan-600" />
                <ZedIcon className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-xs text-zinc-600 font-mono-code ml-1 font-medium">4 connected</span>
            </div>
          </div>
        </div>

        {/* Analytics Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Throughput */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-zinc-900">Weekly Engineering Throughput</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Completed tasks per sprint cycle
                </p>
              </div>
              <ActivityIcon className="w-4 h-4 text-purple-600" />
            </div>

            {weeklyData.length === 0 ? (
              <p className="text-xs font-mono-code text-zinc-400 py-12 text-center">
                No completed tasks recorded in recent weeks.
              </p>
            ) : (
              <div className="space-y-4">
                {weeklyData.map(({ week, count, label }) => (
                  <div key={week}>
                    <div className="flex justify-between text-xs font-mono-code text-zinc-600 mb-1.5">
                      <span>Week of {label}</span>
                      <span className="text-zinc-900 font-semibold">{count} {count === 1 ? "task" : "tasks"}</span>
                    </div>
                    <div className="h-2.5 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full transition-all duration-500"
                        style={{
                          width: `${(count / maxWeeklyCount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Average Completion Time */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-zinc-900">Resolution Cycle Time</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Duration from task creation to completion by priority
                </p>
              </div>
              <ClockIcon className="w-4 h-4 text-blue-600" />
            </div>

            <div className="space-y-4">
              {priorityData.map(({ priority, average, count }) => (
                <div
                  key={priority}
                  className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-3.5 last:border-0"
                >
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono-code uppercase font-semibold border ${
                      priority === "high"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : priority === "medium"
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}>
                      {priority} priority
                    </span>
                    <p className="text-[11px] font-mono-code text-zinc-500 mt-1">
                      {count} completed {count === 1 ? "task" : "tasks"}
                    </p>
                  </div>

                  <p className="text-xs font-mono-code font-semibold text-zinc-900">
                    {average === null ? "No data" : formatDuration(average)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
