'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  // Safe initializer: determines the correct theme on initial client execution
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
    
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Safe effect: Only handles structural DOM class synchronization on state alterations
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="relative w-10 h-10 flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-200 group overflow-hidden cursor-pointer"
    >
      {/* Sun Icon */}
      <svg
        xmlns="http://w3.org"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:rotate-45 absolute dark:scale-0 dark:rotate-90 scale-100 rotate-0"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>

      {/* Moon Icon */}
      <svg
        xmlns="http://w3.org"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-rotate-12 absolute dark:scale-100 dark:rotate-0 scale-0 -rotate-90"
      >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    </button>
  );
}
