'use client';

import { useTheme } from 'next-themes';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

export function ThemeToggleButton() {
  // resolvedTheme is the theme actually shown ('system' resolves to light or dark).
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-10 w-10" aria-hidden="true" />;
  }

  const next = resolvedTheme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="flex h-10 w-10 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-primary/10 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {resolvedTheme === 'dark' ? (
        <SunIcon className="h-5 w-5 text-amber-500" aria-hidden="true" />
      ) : (
        <MoonIcon className="h-5 w-5" aria-hidden="true" />
      )}
    </button>
  );
}
