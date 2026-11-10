import React, { useState } from "react";

/**
 * Navbar widget displaying user level, thin XP progress bar, and badge achievements.
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
    <div className="relative flex items-center gap-2 px-2.5 py-1 bg-zinc-900/80 border border-zinc-800 rounded-lg no-print">
      {/* Current Level Pill */}
      <div className="flex items-center gap-1">
        <span
          className="text-[10px] font-mono-code uppercase font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/30 px-1.5 py-0.5 rounded"
          title={`Level ${level} (Total XP: ${currentXp})`}
        >
          Lv.{level}
        </span>
      </div>

      {/* Thin XP Progress Bar */}
      <div
        className="flex flex-col justify-center gap-0.5 w-16 sm:w-24 cursor-pointer"
        title={`Level ${level} • ${xpInCurrentLevel}/${xpRequiredForNextLevel} XP to Level ${level + 1} (${Math.round(progressPercent)}%) • Total XP: ${currentXp}`}
      >
        <div className="flex justify-between items-center text-[9px] font-mono-code text-zinc-400 leading-none">
          <span>XP</span>
          <span>{xpInCurrentLevel}/{xpRequiredForNextLevel}</span>
        </div>
        <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Badges trigger / quick icons */}
      <div
        className="relative"
        onMouseEnter={() => setShowBadgesPopover(true)}
        onMouseLeave={() => setShowBadgesPopover(false)}
      >
        <button
          type="button"
          onClick={() => setShowBadgesPopover((prev) => !prev)}
          className="flex items-center gap-1 text-xs cursor-pointer hover:opacity-80 transition"
          title={`${unlockedBadges.length}/${allBadges.length} Badges Unlocked (Hover or click to view details)`}
        >
          {allBadges.map((badge) => {
            const isUnlocked = unlockedBadges.includes(badge.id);
            return (
              <span
                key={badge.id}
                className={`transition-all text-xs select-none ${
                  isUnlocked
                    ? "opacity-100 scale-105"
                    : "opacity-25 grayscale hover:opacity-40"
                }`}
                title={`${badge.name}: ${badge.description} (${isUnlocked ? "Unlocked" : "Locked"})`}
              >
                {badge.icon}
              </span>
            );
          })}
        </button>

        {/* Badges Popover / Tooltip */}
        {showBadgesPopover && (
          <div className="absolute right-0 top-full mt-2 z-50 w-64 p-2.5 bg-[#0e1017] border border-zinc-800 rounded-lg shadow-xl shadow-black/60 text-left font-sans">
            <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/80 mb-2">
              <span className="text-xs font-semibold text-zinc-200">
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
                        ? "bg-zinc-900/70 border border-zinc-800/60"
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
    </div>
  );
};

export default XPWidget;

