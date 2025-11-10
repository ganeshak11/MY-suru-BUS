// src/app/announcements/page.tsx

import { Metadata } from 'next';
import AnnouncementForm from './components/AnnouncementForm';
import AnnouncementList from './components/AnnouncementList';

export const metadata: Metadata = {
  title: 'Passenger Announcements',
};

export default function AnnouncementsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Passenger Announcements</h1>
        <p className="text-secondary mt-2">
          Create and broadcast service alerts that will appear as notifications in the passenger app.
        </p>
      </div>

      <div className="grid gap-12 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">New Announcement</h2>
          <AnnouncementForm />
        </div>
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Recent Announcements</h2>
          <AnnouncementList />
        </div>
      </div>
    </div>
  );
}