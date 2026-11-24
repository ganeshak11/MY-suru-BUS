'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import './globals.css';
import SideNav from '@/app/components/SideNav';
import { ThemeProvider } from '@/app/components/ThemeProvider';
import { Bars3Icon } from '@heroicons/react/24/outline';

// Time in milliseconds (10 minutes)
const INACTIVITY_TIMEOUT = 10 * 60 * 1000; 

// Session Timeout Handler Component
function SessionTimeoutHandler() {
  const router = useRouter();
  const timer = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    
    timer.current = setTimeout(() => {
      const token = apiClient.getToken();
      if (token) {
        apiClient.logout();
        router.push('/login'); 
      }
    }, INACTIVITY_TIMEOUT);
  };

  useEffect(() => {
    resetTimer();

    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [router]); 

  return null; 
}

// Auth Check Component
function AuthCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const token = apiClient.getToken();
    const isLoginPage = pathname === '/login';

    if (!token && !isLoginPage) {
      router.replace('/login');
    } else if (token && isLoginPage) {
      router.replace('/');
    } else {
      setIsChecking(false);
    }
  }, [pathname, router]);

  if (isChecking) {
    return null;
  }

  return <>{children}</>;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showSideNav = pathname !== '/login';
  // Public pages: no sign-in, no admin chrome.
  const isPublicPage = pathname === '/live';
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
      </head>
      <body className="h-full">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {isPublicPage ? (
            <div className="h-full bg-background text-foreground">{children}</div>
          ) : (
          <AuthCheck>
            {showSideNav && <SessionTimeoutHandler />}
            <div className="flex h-full bg-background text-foreground">
              {showSideNav && (
                <SideNav isOpen={isSideNavOpen} onClose={() => setIsSideNavOpen(false)} />
              )}
              <main className="relative flex-1 overflow-y-auto bg-background p-4 sm:p-6 lg:p-10">
                {showSideNav && (
                  // Menu button for small screens; the sidebar is permanent from lg up.
                  <div className="-mx-4 -mt-4 mb-4 flex items-center gap-3 border-b border-border/60 px-4 py-3 sm:-mx-6 sm:-mt-6 sm:px-6 lg:hidden">
                    <button
                      type="button"
                      onClick={() => setIsSideNavOpen(true)}
                      className="rounded-lg p-2 text-foreground hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label="Open menu"
                    >
                      <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                    </button>
                    <span className="font-bold text-foreground">MY(suru) BUS</span>
                  </div>
                )}
                <div className="max-w-7xl mx-auto">
                  {children}
                </div>
              </main>
            </div>
          </AuthCheck>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}