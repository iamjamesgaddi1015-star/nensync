"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { type Theme } from "@/lib/theme";

const Context = createContext<{ theme: Theme; change: (theme: Theme) => void }>(
  { theme: "light", change: () => {} },
);

export function ThemeProvider({
  initial,
  children,
}: {
  initial: Theme;
  children: ReactNode;
}) {
  const [theme, setTheme] = useState<Theme>(initial);

  // Sync client-side localStorage overrides on mount safely
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    if (savedTheme && savedTheme !== theme && (savedTheme === "light" || savedTheme === "dark")) {
      queueMicrotask(() => {
        setTheme(savedTheme);
      });
    }
  }, [theme]);

  function change(next: Theme) {
    document.documentElement.dataset.theme = next;

    // Synchronize global classes for Tailwind CSS v4 selector blocks
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    try {
      document.cookie = `nensync-theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
      localStorage.setItem("theme", next);
    } catch {
      /* Choice applies even if local storage options are restricted */
    }
    
    setTheme(next);
  }

  return <Context.Provider value={{ theme, change }}>{children}</Context.Provider>;
}

export function useTheme() {
  return useContext(Context);
}

export function ThemeControl() {
  const { theme, change } = useContext(Context);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    change(nextTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Current theme: ${theme}. Click to switch appearance.`}
      className="relative w-10 h-10 flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-200 group overflow-hidden cursor-pointer"
    >
      {/* Sun Icon (Theme is strictly Light) */}
      <svg
        xmlns="http://w3.org"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`w-5 h-5 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] absolute group-hover:rotate-45 ${
          theme === "light" ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0"
        }`}
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>

      {/* Moon Icon (Theme is strictly Dark) */}
      <svg
        xmlns="http://w3.org"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`w-5 h-5 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] absolute group-hover:-rotate-12 ${
          theme === "dark" ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0"
        }`}
      >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    </button>
  );
}
