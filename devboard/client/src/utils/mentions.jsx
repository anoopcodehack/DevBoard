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
