'use client';

import { useTheme } from 'next-themes';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

export function ThemeToggleButton() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="relative p-3 rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border-2 border-white/20 dark:border-slate-700/50 shadow-xl w-12 h-12" />
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="relative p-3 rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border-2 border-white/20 dark:border-slate-700/50 shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-300 group overflow-hidden w-12 h-12"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-orange-400/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div className="relative">
        {theme === 'light' ? (
          <MoonIcon className="h-6 w-6 text-slate-700 dark:text-slate-300 group-hover:rotate-12 transition-transform" />
        ) : (
          <SunIcon className="h-6 w-6 text-amber-500 group-hover:rotate-90 transition-transform" />
        )}
      </div>
    </button>
  );
}