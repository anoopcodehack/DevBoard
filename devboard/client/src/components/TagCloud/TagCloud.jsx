import React, { useMemo, useState } from "react";
import { useBoard } from "../../context/BoardContext";
import { TagIcon, ChevronDownIcon, ChevronUpIcon } from "../common/Icons";

const MAX_TAGS = 12;
const MIN_FONT_PX = 11;
const MAX_FONT_PX = 18;

const TagCloud = () => {
  // allTasks, not tasks: the filtered list would shrink the cloud down to the
  // tags of the selected tag's tasks as soon as one is clicked.
  const { allTasks, activeTag, setActiveTag } = useBoard();
  const [collapsed, setCollapsed] = useState(false);

  const topTags = useMemo(() => {
    const counts = {};
    (allTasks || []).forEach((task) => {
      // a tag listed twice on one task still counts once for that task
      new Set(task.tags || []).forEach((tag) => {
        if (tag) counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, MAX_TAGS);
  }, [allTasks]);

  if (topTags.length === 0) return null;

  const highest = topTags[0][1];
  const lowest = topTags[topTags.length - 1][1];
  const fontSize = (count) => {
    if (highest === lowest) return MIN_FONT_PX + 2;
    const share = (count - lowest) / (highest - lowest);
    return Math.round(MIN_FONT_PX + share * (MAX_FONT_PX - MIN_FONT_PX));
  };

  return (
    <div className="px-5 py-2.5 bg-[#0e1015] border-b border-zinc-800/80 select-none">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center gap-2 text-[11px] font-mono-code text-zinc-400 hover:text-zinc-200 transition"
      >
        <TagIcon className="w-3.5 h-3.5 text-zinc-500" />
        <span className="font-semibold uppercase tracking-wider text-zinc-300">Top Tags</span>
        <span className="text-zinc-500">·</span>
        <span className="text-zinc-400">click one to filter the board</span>
        {collapsed ? <ChevronDownIcon className="w-3 h-3 text-zinc-500" /> : <ChevronUpIcon className="w-3 h-3 text-zinc-500" />}
      </button>

      {!collapsed && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 mt-2">
          {topTags.map(([tag, count]) => {
            const active = activeTag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(active ? null : tag)}
                aria-pressed={active}
                title={`${count} task${count === 1 ? "" : "s"} tagged #${tag}`}
                style={{ fontSize: `${fontSize(count)}px` }}
                className={`leading-tight px-2 py-0.5 rounded-full border transition ${
                  active
                    ? "text-purple-200 bg-purple-500/30 border-purple-400/60"
                    : "text-purple-400 bg-purple-500/10 border-transparent hover:bg-purple-500/20"
                }`}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TagCloud;
