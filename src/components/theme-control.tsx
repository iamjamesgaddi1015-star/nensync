"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { safeTheme, type Theme } from "@/lib/theme";
const Context = createContext<{ theme: Theme; change: (theme: Theme) => void }>(
  { theme: "system", change: () => {} },
);
export function ThemeProvider({
  initial,
  children,
}: {
  initial: Theme;
  children: ReactNode;
}) {
  const [theme, setTheme] = useState(initial);
  function change(next: Theme) {
    document.documentElement.dataset.theme = next;
    try {
      document.cookie = `nensync-theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    } catch {
      /* The current choice still applies when persistence is blocked. */
    }
    setTheme(next);
  }
  return <Context value={{ theme, change }}>{children}</Context>;
}
export function ThemeControl() {
  const { theme, change } = useContext(Context);
  return (
    <label className="theme-picker">
      <span className="sr-only">Appearance</span>
      <select
        aria-label="Appearance"
        value={theme}
        onChange={(e) => change(safeTheme(e.target.value))}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
