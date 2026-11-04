type DraftStore = Pick<Storage, "length" | "key" | "getItem" | "removeItem">;
export function draftPrefix(userId: string, demo = false) {
  return `nensync.draft.${demo ? "demo" : "account"}.${userId}.`;
}
// Only inspect the active account's namespace. Expiry removes stored content.
export function sweepDrafts(
  storage: DraftStore,
  prefix: string,
  now = Date.now(),
) {
  const keys = Array.from({ length: storage.length }, (_, i) =>
    storage.key(i),
  ).filter((key): key is string => key !== null && key.startsWith(prefix));
  for (const key of keys) {
    let valid = false;
    try {
      const draft: unknown = JSON.parse(storage.getItem(key) ?? "null");
      if (
        draft &&
        typeof draft === "object" &&
        "savedAt" in draft &&
        typeof draft.savedAt === "number" &&
        Number.isFinite(draft.savedAt) &&
        now - draft.savedAt <= 7 * 86400000 &&
        draft.savedAt <= now + 300000 &&
        "version" in draft &&
        Number.isInteger(draft.version) &&
        "text" in draft &&
        draft.text &&
        typeof draft.text === "object"
      ) {
        const text = draft.text as Record<string, unknown>;
        valid = ["yesterday_text", "today_text", "blockers_text"].every(
          (k) => typeof text[k] === "string" && String(text[k]).length <= 5000,
        );
      }
    } catch {
      valid = false;
    }
    if (!valid) storage.removeItem(key);
  }
}
