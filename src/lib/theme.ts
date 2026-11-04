export type Theme = "light" | "dark";

export function safeTheme(value: string | undefined | null): Theme {
  if (value === "dark" || value === "light") {
    return value;
  }
  // Fallback default value if cookie is missing or unreadable
  return "light";
}
