'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import SideNav from '@/app/components/SideNav';
import { ThemeProvider } from '@/app/components/ThemeProvider';
import { ThemeToggleButton } from '@/app/components/ThemeToggleButton';
import { Bars3Icon } from '@heroicons/react/24/outline';

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes

function SessionTimeoutHandler() {
    const router = useRouter();
    const timer = useRef<NodeJS.Timeout | null>(null);

    const resetTimer = () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(async () => {
            // Use getUser() instead of getSession() — validates with server
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.auth.signOut();
                router.push('/login');
            }
        }, INACTIVITY_TIMEOUT);
    };

    useEffect(() => {
        resetTimer();
        const events = ['mousemove', 'keydown', 'click', 'scroll'];
        events.forEach(event => window.addEventListener(event, resetTimer));

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!session) {
                if (timer.current) clearTimeout(timer.current);
                router.push('/login');
            } else {
                resetTimer();
            }
        });

        return () => {
            if (timer.current) clearTimeout(timer.current);
            events.forEach(event => window.removeEventListener(event, resetTimer));
            subscription.unsubscribe();
        };
    }, [router]);

    return null;
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const showSideNav = pathname !== '/login';
    const [isSideNavOpen, setIsSideNavOpen] = useState(false);

    return (
        <>
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
                            <button
                                onClick={() => setIsSideNavOpen(!isSideNavOpen)}
                                className={`lg:hidden fixed top-4 left-4 z-50 p-2 sm:p-3 rounded-lg sm:rounded-xl text-white bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-300 group ${isSideNavOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
                                    }`}
                            >
                                <Bars3Icon className="h-5 w-5 sm:h-6 sm:w-6 group-hover:rotate-180 transition-transform duration-300" />
                            </button>
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
        </>
    );
}
