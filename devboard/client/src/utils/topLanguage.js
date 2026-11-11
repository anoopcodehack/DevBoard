// The snippet language used most across the board, or null when there are no
// snippets. Ties go to the alphabetically first language so the badge does not
// flip between renders.
export const topLanguage = (tasks) => {
  const counts = {};
  let total = 0;
  for (const task of tasks || []) {
    for (const snippet of task.snippets || []) {
      const language = String(snippet?.language || "")
        .trim()
        .toLowerCase();
      if (!language) continue;
      counts[language] = (counts[language] || 0) + 1;
      total += 1;
    }
  }
  const [language, count] =
    Object.entries(counts).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0] || [];
  return language ? { language, count, total } : null;
};
