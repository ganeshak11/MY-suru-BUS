'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import './globals.css';
import SideNav from '@/app/components/SideNav';
import { ThemeProvider } from '@/app/components/ThemeProvider';
import { ThemeToggleButton } from '@/app/components/ThemeToggleButton';
import { Bars3Icon } from '@heroicons/react/24/outline';

// Time in milliseconds (10 minutes)
const INACTIVITY_TIMEOUT = 10 * 60 * 1000; 

// --- ADDED: Session Timeout Handler Component ---
function SessionTimeoutHandler() {
  const router = useRouter();
  const timer = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    // Clear any existing timer
    if (timer.current) {
      clearTimeout(timer.current);
    }
    
    // Set a new timer
    timer.current = setTimeout(async () => {
      // Check if a session exists before signing out
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log("Session timed out due to inactivity. Signing out.");
        await supabase.auth.signOut();
        router.push('/login'); 
      }
    }, INACTIVITY_TIMEOUT);
  };

  useEffect(() => {
    // 1. Start timer on mount
    resetTimer();

    // 2. Event listeners to detect activity across the window
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    // 3. Listen for auth changes (in case the user signs out manually elsewhere)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!session) {
            // If user logs out, stop the timer and ensure redirection happens
            if (timer.current) clearTimeout(timer.current);
            router.push('/login');
        } else {
            // If user logs in/session is refreshed, reset the timer
            resetTimer();
        }
    });


    // 4. Cleanup: Clear timer and remove event listeners
    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach(event => window.removeEventListener(event, resetTimer));
      subscription.unsubscribe();
    };
  }, [router]); 

  return null; 
}
// --- END Session Timeout Handler ---

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showSideNav = pathname !== '/login';
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
      </head>
      <body className="h-full">
        {/* --- ADDED: Session Handler Here --- */}
        {showSideNav && <SessionTimeoutHandler />}
        
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex h-full bg-background text-foreground">
            {showSideNav && (
              <>
                {/* Hamburger button - only visible on mobile */}
                <button
                  onClick={() => setIsSideNavOpen(!isSideNavOpen)}
                  className={`lg:hidden fixed top-4 left-4 z-50 p-2 sm:p-3 rounded-lg sm:rounded-xl text-white bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-300 group ${
                    isSideNavOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
                  }`}
                >
                  <Bars3Icon className="h-5 w-5 sm:h-6 sm:w-6 group-hover:rotate-180 transition-transform duration-300" />
                </button>
                {/* Left edge hover trigger - only on desktop */}
                <div 
                  className="hidden lg:block fixed left-0 top-0 bottom-0 w-4 z-30"
                  onMouseEnter={() => setIsSideNavOpen(true)}
                />
                <SideNav
                  isOpen={isSideNavOpen}
                  onClose={() => setIsSideNavOpen(false)}
                  onMouseEnter={() => setIsSideNavOpen(true)}
                  onMouseLeave={() => setTimeout(() => setIsSideNavOpen(false), 300)}
                />
              </>
            )}
            <main className="flex-1 p-4 sm:p-6 lg:p-12 pt-20 lg:pt-6 overflow-y-auto bg-background relative">
              {showSideNav && (
                <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-40">
                  <ThemeToggleButton />
                </div>
              )}
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}