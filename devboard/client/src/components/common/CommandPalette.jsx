import React, { useEffect, useMemo, useRef, useState } from "react";
import { SearchIcon } from "./Icons";

const MAX_TASKS = 8;

const matches = (text, query) =>
  String(text || "")
    .toLowerCase()
    .includes(query);

// same names as the column headers on the board
const STATUS_LABELS = {
  backlog: "Backlog",
  inprogress: "In Progress",
  review: "In Review",
  done: "Completed",
};

const statusLabel = (status) => STATUS_LABELS[status] || status || "";

// Ctrl/Cmd+K palette: type to filter actions and tasks, Enter runs the
// highlighted entry. Opening and closing is handled by the parent.
const CommandPalette = ({ open, onClose, actions, tasks, onSelectTask }) => {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    // focus after the dialog is painted
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    const actionEntries = actions
      .filter((action) => !q || matches(action.label, q))
      .map((action) => ({
        id: `action-${action.id}`,
        label: action.label,
        hint: action.hint,
        run: action.run,
      }));
    const taskEntries = (tasks || [])
      .filter(
        (task) => !q || matches(task.title, q) || matches(task.description, q),
      )
      .slice(0, MAX_TASKS)
      .map((task) => ({
        id: `task-${task._id}`,
        label: task.title || "Untitled task",
        hint: statusLabel(task.status),
        run: () => onSelectTask(task),
      }));
    return [...actionEntries, ...taskEntries];
  }, [actions, tasks, query, onSelectTask]);

  useEffect(() => {
    setActive((index) => Math.min(index, Math.max(0, entries.length - 1)));
  }, [entries.length]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const runEntry = (entry) => {
    if (!entry) return;
    onClose();
    entry.run();
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (entries.length) setActive((index) => (index + 1) % entries.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (entries.length)
        setActive((index) => (index - 1 + entries.length) % entries.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      runEntry(entries[active]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
  };

  const firstTaskIndex = entries.findIndex((entry) =>
    entry.id.startsWith("task-"),
  );

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center z-[60] p-4 pt-[15vh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="bg-[#121319] border border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
          <SearchIcon className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search tasks..."
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-activedescendant={
              entries[active] ? `command-${entries[active].id}` : undefined
            }
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
          />
          <kbd className="bg-zinc-900 border border-zinc-700 px-1.5 py-0.5 rounded text-[10px] text-zinc-400 font-mono-code">
            ESC
          </kbd>
        </div>
        <ul
          id="command-palette-list"
          ref={listRef}
          role="listbox"
          className="max-h-80 overflow-y-auto py-1"
        >
          {entries.length === 0 && (
            <li className="px-4 py-6 text-center text-xs text-zinc-500">
              Nothing matches "{query.trim()}"
            </li>
          )}
          {entries.map((entry, index) => (
            <React.Fragment key={entry.id}>
              {index === firstTaskIndex && (
                <li
                  role="presentation"
                  className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider text-zinc-500 font-mono-code"
                >
                  Tasks
                </li>
              )}
              <li
                id={`command-${entry.id}`}
                data-index={index}
                role="option"
                aria-selected={index === active}
                onMouseMove={() => setActive(index)}
                onClick={() => runEntry(entry)}
                className={`mx-1 px-3 py-2 rounded-lg flex items-center justify-between gap-3 cursor-pointer text-sm ${
                  index === active
                    ? "bg-[var(--accent-20)] text-zinc-100"
                    : "text-zinc-300"
                }`}
              >
                <span className="truncate">{entry.label}</span>
                {entry.hint && (
                  <span className="shrink-0 text-[10px] text-zinc-500 font-mono-code">
                    {entry.hint}
                  </span>
                )}
              </li>
            </React.Fragment>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default CommandPalette;
