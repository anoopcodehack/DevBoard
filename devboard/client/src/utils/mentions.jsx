// @username mentions in task text (#279). Built from strings and spans, never
// injected HTML, so a description can't smuggle markup onto the board.

// An @ that starts a word: "ping @mario" yes, "mail a@b.com" no.
const MENTION_SPLIT = /((?<![\w@.])@\w+)/g;
const MENTION = /^@\w+$/;

export const hasMentions = (text) =>
  typeof text === "string" && text.split(MENTION_SPLIT).some((part) => MENTION.test(part));

export const renderMentions = (text) => {
  if (!text) return text;
  return String(text)
    .split(MENTION_SPLIT)
    .map((part, i) =>
      MENTION.test(part) ? (
        <span key={i} className="text-purple-300 bg-purple-500/15 rounded px-0.5 font-medium">
          {part}
        </span>
      ) : (
        part
      ),
    );
};

const MAX_SUGGESTIONS = 5;
// Same rule as MENTION_SPLIT, anchored at the caret: the @ being typed right now.
const ACTIVE_MENTION = /(?<![\w@.])@(\w*)$/;

// Mentions only cover \w, so "José Díaz" has to become "JoseDiaz" to highlight whole.
export const mentionHandle = (name) =>
  String(name || "")
    .normalize("NFD")
    .replace(/\W/g, "");

export const activeMention = (text, caret) => {
  const match = String(text || "").slice(0, caret).match(ACTIVE_MENTION);
  return match ? { start: caret - match[0].length, query: match[1] } : null;
};

export const mentionSuggestions = (members, query) => {
  const needle = String(query || "").toLowerCase();
  const seen = new Set();
  return (members || [])
    .map((member) => ({ ...member, handle: mentionHandle(member.name) }))
    .filter(({ handle, name }) => {
      // Two people with the same name would insert the same text.
      if (!handle || seen.has(handle)) return false;
      if (
        !handle.toLowerCase().includes(needle) &&
        !name.toLowerCase().includes(needle)
      ) {
        return false;
      }
      seen.add(handle);
      return true;
    })
    .slice(0, MAX_SUGGESTIONS);
};

export const insertMention = (text, mention, caret, handle) => {
  const rest = text.slice(caret);
  // Reuse a space that is already there, and always land after it.
  const inserted = /^\s/.test(rest) ? `@${handle}` : `@${handle} `;
  return {
    text: text.slice(0, mention.start) + inserted + rest,
    caret: mention.start + `@${handle} `.length,
  };
};
