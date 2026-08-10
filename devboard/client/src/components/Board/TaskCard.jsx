import React, { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useBoard } from "../../context/BoardContext";
import { useSuggestTags } from "../../hooks/useSuggestTags";

const PRIORITY_COLORS = {
  high: "bg-red-500/20 text-red-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-green-500/20 text-green-400",
};

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date);
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
};

const TaskCard = ({ task, index, onSelect }) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState(0);
  const [copied, setCopied] = useState(false);
  const { activeTag, setActiveTag , updateTask } = useBoard();
  const { suggestedTags,loadingTags,handleSuggestTags,handleAddTag } = useSuggestTags(task,selectedSnippet,updateTask);

  // Check if the task due date has passed and the task is not completed ---------
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(task.dueDate);
  const isOverdue = task.dueDate && dueDate < today && task.status !== "done";
  // const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "Done";
  // ------------------

  return (
    <Draggable draggableId={String(task._id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onSelect(task)}
          className={`bg-[var(--bg-card)] border rounded-lg p-3 cursor-pointer transition-all
            ${snapshot.isDragging ? "border-purple-500 shadow-lg shadow-purple-500/10" : isOverdue
      ? "border-red-500 border-l-4 hover:border-red-400": "border-[var(--border-primary)] hover:border-[#444]"}`}
        >
          {/* Title */}
          <p className="text-sm font-medium text-[#f0f0f0] leading-snug mb-2">
            {task.title}
          </p>

          {/* GitHub issue link */}
          {task.githubIssueUrl && (
            <a
              href={task.githubIssueUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[10px] text-[#666] hover:text-purple-400 mb-2"
            >
              <span>🔗</span> #{task.githubIssueNumber} GitHub Issue
            </a>
          )}

          {/* Code snippets preview */}
          {task.snippets?.length > 0 && (
            <div className=" mb-2">
              <div className="flex items-center justify-between mb-1">
                 <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded((v) => !v);
                }}
                className="text-[10px] text-purple-400 hover:text-purple-300 mb-1"
              >
                {"</>"} {task.snippets.length} snippet
                {task.snippets.length > 1 ? "s" : ""} {expanded ? "▲" : "▼"}
              </button>

                <button
                 onClick={handleSuggestTags}
                 disabled={loadingTags}
                  className="text-[10px] px-2 py-1 rounded bg-purple-600 text-white hover:bg-purple-700"
                >
                  {loadingTags ? "Loading..." : "Suggest tags"}
                </button>
              </div>
             

              <div className="flex gap-1 mb-2">
                {task.snippets.map((snippet, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSnippet(index);
                    }}
                    className="text-[10px] px-2 py-1 rounded bg-[var(--border-primary)]"
                  >
                    Snippet {index + 1}
                  </button>
                ))}
              </div>

                {suggestedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                      {suggestedTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddTag(tag);
                          }}
                           className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/40"
                        >
                          + {tag}
                        </button>
                      ))}
                  </div>
                )}


              {/* Updated Snippet Block with Copy Button */}
              {expanded && (
                <>
                  <div className="flex justify-end mb-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(
                          task.snippets[selectedSnippet].code
                        );
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="text-[10px] px-2 py-1 rounded bg-purple-600 text-white hover:bg-purple-700"
                    >
                      {copied ? "Copied! ✅" : "Copy"}
                    </button>
                  </div>

                  <SyntaxHighlighter
                    language={
                      task.snippets[selectedSnippet].language || "javascript"
                    }
                    style={vscDarkPlus}
                    customStyle={{
                      fontSize: 10,
                      borderRadius: 6,
                      margin: 0,
                      padding: "8px 10px",
                    }}
                  >
                    {task.snippets[selectedSnippet].code}
                  </SyntaxHighlighter>
                </>
              )}
            </div>
          )}

          {/* Tags + Priority */}
          <div className="flex flex-wrap gap-1 mt-1">
            {task.priority && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PRIORITY_COLORS[task.priority]}`}
              >
                {task.priority}
              </span>
            )}
            {task.tags?.map((tag) => {
              const t = tag.trim(); // legacy rows may hold untrimmed tags
              return (
                <span
                  key={t}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTag(activeTag === tag ? null : tag);
                  }}
                  className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition
                    ${activeTag === tag
                      ? "bg-purple-600/30 text-purple-300 ring-1 ring-purple-500"
                      : "bg-[var(--border-primary)] text-[#888] hover:bg-[var(--border-primary)]/80"
                    }`}
                >
                  {t.length > 15 ? t.slice(0, 15) + "..." : t}
                </span>
              );
            })}
          </div>

          {/* Due date */}
          {task.dueDate && (
            <div
              className={`mt-2 text-[10px] ${
                isOverdue ? "text-red-400" : "text-[#888]"
              }`}
            >
              📅 {new Date(task.dueDate).toLocaleDateString()}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 text-[#555] text-[10px]">
              {task.pomodoroCount > 0 && <span>🍅 ×{task.pomodoroCount}</span>}
              {task.snippets?.length > 0 && (
                <span>📎 {task.snippets.length}</span>
              )}
              {task.createdAt && (
                <span>🕐 {timeAgo(task.createdAt)}</span>
              )}
            </div>
            {task.assignee?.name && (
              <div title={task.assignee.name} className="w-5 h-5 rounded-full bg-purple-700 flex items-center justify-center text-[9px] font-bold text-white">
                {task.assignee.name[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;