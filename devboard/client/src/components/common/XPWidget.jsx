import React, { useState } from "react";

/**
 * Compact navbar widget displaying user level, thin XP progress bar, and badge achievements.
 * Designed to be ultra space-efficient to prevent header overflow.
 */
export const XPWidget = ({
  level = 1,
  currentXp = 0,
  xpInCurrentLevel = 0,
  xpRequiredForNextLevel = 50,
  progressPercent = 0,
  unlockedBadges = [],
  allBadges = [],
}) => {
  const [showBadgesPopover, setShowBadgesPopover] = useState(false);

  return (
    <div
      className="relative flex items-center gap-1.5 px-2 py-0.5 bg-zinc-900/90 border border-zinc-800 hover:border-purple-500/40 rounded-md no-print select-none cursor-pointer transition shrink-0"
      onMouseEnter={() => setShowBadgesPopover(true)}
      onMouseLeave={() => setShowBadgesPopover(false)}
      onClick={() => setShowBadgesPopover((prev) => !prev)}
      title={`Level ${level} (${currentXp} XP) • ${xpInCurrentLevel}/${xpRequiredForNextLevel} XP to Lv.${level + 1} (${Math.round(progressPercent)}%) • ${unlockedBadges.length}/${allBadges.length} Badges`}
    >
      {/* Current Level Pill */}
      <span className="text-[10px] font-mono-code uppercase font-bold text-purple-400 bg-purple-500/10 border border-purple-500/30 px-1.5 py-0.2 rounded leading-tight">
        Lv.{level}
      </span>

      {/* Thin XP Progress Bar */}
      <div className="w-10 sm:w-14">
        <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Badges indicator */}
      <span className="text-xs leading-none" title="Achievements">
        🏆
      </span>

      {/* Badges Popover / Tooltip */}
      {showBadgesPopover && (
        <div className="absolute left-0 top-full mt-2 z-50 w-64 p-2.5 bg-[#0e1017] border border-zinc-800 rounded-lg shadow-2xl shadow-black text-left font-sans cursor-default">
          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/80 mb-2">
            <span className="text-xs font-semibold text-zinc-200">
              Level {level} Progress
            </span>
            <span className="text-[10px] font-mono-code text-purple-300">
              {xpInCurrentLevel}/{xpRequiredForNextLevel} XP ({Math.round(progressPercent)}%)
            </span>
          </div>

          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-zinc-800/60">
            <span className="text-[11px] font-medium text-zinc-300">
              Achievements
            </span>
            <span className="text-[10px] font-mono-code text-zinc-400">
              {unlockedBadges.length}/{allBadges.length} Unlocked
            </span>
          </div>

          <div className="space-y-1.5">
            {allBadges.map((badge) => {
              const isUnlocked = unlockedBadges.includes(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`flex items-center gap-2 p-1.5 rounded transition ${
                    isUnlocked
                      ? "bg-zinc-900/80 border border-zinc-800/70"
                      : "opacity-40"
                  }`}
                >
                  <span className="text-base select-none">{badge.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-200 truncate">
                        {badge.name}
                      </span>
                      <span className="text-[9px] font-mono-code text-zinc-400 ml-1">
                        {isUnlocked ? "✓ Unlocked" : "Locked"}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 truncate">
                      {badge.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default XPWidget;
