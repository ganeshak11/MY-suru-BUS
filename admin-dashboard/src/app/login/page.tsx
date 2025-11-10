'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Note: No 'loading' state implemented here, but highly recommended for better UX
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-main-background">
      <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-xl shadow-2xl border border-secondary/20">
        
        {/* --- BRANDING ADDED --- */}
        <div className="text-center">
            <h1 className="text-3xl font-extrabold text-primary">MY(suru) BUS</h1>
            <p className="mt-1 text-sm font-medium text-foreground">Admin Dashboard Login</p>
        </div>
        {/* --- END BRANDING --- */}
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-secondary">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              // --- THEME UPDATE: Inputs ---
              className="block w-full px-3 py-2 mt-1 text-foreground bg-background border border-secondary/50 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-secondary"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              // --- THEME UPDATE: Inputs ---
              className="block w-full px-3 py-2 mt-1 text-foreground bg-background border border-secondary/50 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            />
          </div>
          {/* --- THEME UPDATE: Error --- */}
          {error && <p className="text-sm text-danger">{error}</p>}
          
          <div>
            <button
              type="submit"
              // --- THEME UPDATE: Button ---
              className="w-full px-4 py-2 text-base font-medium text-primary-foreground bg-primary rounded-lg shadow-md hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}