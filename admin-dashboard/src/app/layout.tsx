'use client';

import { useState, useEffect, useRef } from 'react'; // ADDED hooks
import { usePathname, useRouter } from 'next/navigation'; // ADDED useRouter
import { supabase } from '@/lib/supabaseClient'; // ADDED supabase client
import './globals.css';
import SideNav from '@/app/components/SideNav';
import { ThemeProvider } from '@/app/components/ThemeProvider';
import Head from 'next/head';
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
      <Head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"
          integrity="sha512-xodZBNTC5n17Xt2atTPuE1HxjVMSvLVW9ocqUKLsCC5CXdbqCmblAshOMAS6/keqq/sMZMZ19scR4PsZChSR7A=="
          crossOrigin=""/>
        <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"
          integrity="sha512-XQoYMqMTK8LvdxXYG3nZ448hOEQiglfqkJs1NOQV44cWnUrBc8PkAOcXy20w0vlaXaVUearIOBhiXZ5V3ynxwA=="
          crossOrigin=""></script>
      </Head>
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
                {showSideNav && (
                  <button
                    onClick={() => setIsSideNavOpen(!isSideNavOpen)}
                    onMouseEnter={() => setIsSideNavOpen(true)}
                    // --- THEME UPDATE ---
                    className="fixed top-4 left-4 z-50 p-2 rounded-lg text-foreground bg-card shadow-lg hover:ring-2 hover:ring-primary/50 transition-all"
                  >
                    <Bars3Icon className="h-6 w-6" />
                  </button>
                )}
                <SideNav
                  isOpen={isSideNavOpen}
                  onClose={() => setIsSideNavOpen(false)}
                  onMouseEnter={() => setIsSideNavOpen(true)}
                  onMouseLeave={() => setTimeout(() => setIsSideNavOpen(false), 300)}
                />
              </>
            )}
            <main className="flex-1 p-6 sm:p-8 lg:p-12 pl-20 overflow-y-auto bg-background">
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