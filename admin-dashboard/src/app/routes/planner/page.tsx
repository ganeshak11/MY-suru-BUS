// src/app/routes/planner/page.tsx
'use client'; // --- ADDED: Must be a client component for navigation

import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import RoutePlanner from './components/RoutePlanner';
import { useRouter } from 'next/navigation'; // --- ADDED

// export const metadata: Metadata = { // Metadata must be in static components
//   title: 'Interactive Route Planner',
// };

export default function RoutePlannerPage() {
  const router = useRouter(); // --- ADDED

  // --- ADDED: Handlers to navigate away ---
  const handleCancel = () => {
    router.push('/routes');
  };

  const handleSaveSuccess = () => {
    // You could show a success message here before navigating
    router.push('/routes');
  };

  return (
    <RoutePlanner 
      onCancel={handleCancel}
      onSaveSuccess={handleSaveSuccess}
    />
  );
}