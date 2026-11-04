export type Theme = "light" | "dark" | "system";
export function safeTheme(value: unknown): Theme {
  return value === "light" || value === "dark" ? value : "system";
}
