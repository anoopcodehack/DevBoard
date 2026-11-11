// The session URL ends up in an href, so anything other than http(s) is
// refused: a "javascript:" URL would run on click. The server checks the same.
export const isSessionUrl = (value) => /^https?:\/\//i.test(value || "");
