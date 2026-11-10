import { useState, useCallback, useMemo } from "react";
import { toast } from "react-toastify";

export const STORAGE_KEYS = {
  XP: "devboard_xp",
  AWARDED_TASKS: "devboard_awarded_task_ids",
  UNLOCKED_BADGES: "devboard_unlocked_badges",
  HIGH_PRIORITY_TASKS: "devboard_high_priority_task_ids",
};

export const BADGES = [
  {
    id: "first_blood",
    name: "First Blood",
    description: "Complete your first task",
    icon: "🩸",
  },
  {
    id: "double_digits",
    name: "Double Digits",
    description: "Complete 10 tasks",
    icon: "🔟",
  },
  {
    id: "heavy_hitter",
    name: "Heavy Hitter",
    description: "Complete 5 high-priority tasks",
    icon: "⚡",
  },
];

export const XP_BY_PRIORITY = {
  low: 10,
  medium: 20,
  high: 40,
};

/**
 * Formula: level = Math.floor(Math.sqrt(xp / 50)) + 1
 */
export const levelFromXp = (xp) => {
  const safeXp = Math.max(0, Number(xp) || 0);
  return Math.floor(Math.sqrt(safeXp / 50)) + 1;
};

/**
 * Computes level progress and threshold boundaries
 */
export const getLevelProgress = (xp) => {
  const safeXp = Math.max(0, Number(xp) || 0);
  const currentLevel = levelFromXp(safeXp);
  const currentLevelBaseXp = Math.pow(currentLevel - 1, 2) * 50;
  const nextLevelBaseXp = Math.pow(currentLevel, 2) * 50;
  const xpInCurrentLevel = safeXp - currentLevelBaseXp;
  const xpRequiredForNextLevel = nextLevelBaseXp - currentLevelBaseXp;
  const progressPercent = Math.min(
    100,
    Math.max(0, (xpInCurrentLevel / xpRequiredForNextLevel) * 100)
  );

  return {
    level: currentLevel,
    currentXp: safeXp,
    xpInCurrentLevel,
    xpRequiredForNextLevel,
    nextLevelBaseXp,
    progressPercent,
  };
};

const safeGetNumber = (key, fallback = 0) => {
  try {
    const val = localStorage.getItem(key);
    if (val === null || val === undefined) return fallback;
    const num = Number(val);
    return Number.isFinite(num) ? num : fallback;
  } catch {
    return fallback;
  }
};

const safeGetArray = (key, fallback = []) => {
  try {
    const val = localStorage.getItem(key);
    if (!val) return fallback;
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const safeSetItem = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn(`[useXP] Could not persist ${key} to localStorage:`, err);
  }
};

export const useXP = () => {
  const [xp, setXp] = useState(() => safeGetNumber(STORAGE_KEYS.XP, 0));
  const [awardedTaskIds, setAwardedTaskIds] = useState(() =>
    safeGetArray(STORAGE_KEYS.AWARDED_TASKS, [])
  );
  const [unlockedBadges, setUnlockedBadges] = useState(() =>
    safeGetArray(STORAGE_KEYS.UNLOCKED_BADGES, [])
  );
  const [highPriorityTaskIds, setHighPriorityTaskIds] = useState(() =>
    safeGetArray(STORAGE_KEYS.HIGH_PRIORITY_TASKS, [])
  );

  const levelProgress = useMemo(() => getLevelProgress(xp), [xp]);

  /**
   * Awards XP for a completed task and checks for badge unlocks.
   * Guarantees each task ID only awards XP once.
   */
  const awardTaskXP = useCallback(
    (task) => {
      if (!task || !task._id) return { awarded: false, reason: "invalid_task" };

      const taskId = String(task._id);

      // Verify task hasn't already been awarded XP
      const currentAwarded = safeGetArray(STORAGE_KEYS.AWARDED_TASKS, awardedTaskIds);
      if (currentAwarded.includes(taskId)) {
        return { awarded: false, reason: "already_awarded" };
      }

      // Determine XP based on task priority
      const priority = String(task.priority || "medium").toLowerCase();
      const points = XP_BY_PRIORITY[priority] ?? XP_BY_PRIORITY.medium;

      // 1. Update XP
      const currentXp = safeGetNumber(STORAGE_KEYS.XP, xp);
      const newXp = currentXp + points;
      safeSetItem(STORAGE_KEYS.XP, String(newXp));
      setXp(newXp);

      // 2. Mark task ID as awarded
      const updatedAwarded = [...currentAwarded, taskId];
      safeSetItem(STORAGE_KEYS.AWARDED_TASKS, JSON.stringify(updatedAwarded));
      setAwardedTaskIds(updatedAwarded);

      // 3. Track high-priority completions
      const currentHighPriority = safeGetArray(
        STORAGE_KEYS.HIGH_PRIORITY_TASKS,
        highPriorityTaskIds
      );
      let updatedHighPriority = currentHighPriority;
      if (priority === "high" && !currentHighPriority.includes(taskId)) {
        updatedHighPriority = [...currentHighPriority, taskId];
        safeSetItem(
          STORAGE_KEYS.HIGH_PRIORITY_TASKS,
          JSON.stringify(updatedHighPriority)
        );
        setHighPriorityTaskIds(updatedHighPriority);
      }

      // 4. Check for badge unlocks
      const currentBadges = safeGetArray(
        STORAGE_KEYS.UNLOCKED_BADGES,
        unlockedBadges
      );
      const newlyUnlocked = [];

      const totalCompleted = updatedAwarded.length;
      const highCompleted = updatedHighPriority.length;

      // Badge 1: First Blood (First completed task)
      if (!currentBadges.includes("first_blood") && totalCompleted >= 1) {
        newlyUnlocked.push("first_blood");
      }

      // Badge 2: Double Digits (10 completed tasks)
      if (!currentBadges.includes("double_digits") && totalCompleted >= 10) {
        newlyUnlocked.push("double_digits");
      }

      // Badge 3: Heavy Hitter (5 high-priority completed tasks)
      if (!currentBadges.includes("heavy_hitter") && highCompleted >= 5) {
        newlyUnlocked.push("heavy_hitter");
      }

      if (newlyUnlocked.length > 0) {
        const updatedBadges = [...currentBadges, ...newlyUnlocked];
        safeSetItem(
          STORAGE_KEYS.UNLOCKED_BADGES,
          JSON.stringify(updatedBadges)
        );
        setUnlockedBadges(updatedBadges);

        // Display toast notification for each unlocked badge
        newlyUnlocked.forEach((badgeId) => {
          const badge = BADGES.find((b) => b.id === badgeId);
          if (badge) {
            toast.success(`🏆 Badge Unlocked: ${badge.name}!`, {
              icon: badge.icon,
            });
          }
        });
      }

      return {
        awarded: true,
        earnedXp: points,
        newXp,
        newlyUnlockedBadges: newlyUnlocked,
      };
    },
    [awardedTaskIds, highPriorityTaskIds, unlockedBadges, xp]
  );

  /**
   * Resets all gamification data (useful for testing or clearing board data).
   */
  const resetXP = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.XP);
      localStorage.removeItem(STORAGE_KEYS.AWARDED_TASKS);
      localStorage.removeItem(STORAGE_KEYS.UNLOCKED_BADGES);
      localStorage.removeItem(STORAGE_KEYS.HIGH_PRIORITY_TASKS);
    } catch {
      // Ignore
    }
    setXp(0);
    setAwardedTaskIds([]);
    setUnlockedBadges([]);
    setHighPriorityTaskIds([]);
  }, []);

  return {
    xp,
    level: levelProgress.level,
    currentXp: levelProgress.currentXp,
    xpInCurrentLevel: levelProgress.xpInCurrentLevel,
    xpRequiredForNextLevel: levelProgress.xpRequiredForNextLevel,
    nextLevelBaseXp: levelProgress.nextLevelBaseXp,
    progressPercent: levelProgress.progressPercent,
    awardedTaskIds,
    unlockedBadges,
    highPriorityTaskIds,
    allBadges: BADGES,
    awardTaskXP,
    resetXP,
  };
};

export default useXP;

