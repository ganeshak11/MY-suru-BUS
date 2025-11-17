// src/app/announcements/page.tsx

import { Metadata } from 'next';
import AnnouncementForm from './components/AnnouncementForm';
import AnnouncementList from './components/AnnouncementList';

export const metadata: Metadata = {
  title: 'Passenger Announcements',
};

export default function AnnouncementsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Announcements</h1>
        <p className="text-secondary text-base">
          Create and broadcast service alerts that will appear as notifications in the passenger app
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="bg-gradient-to-br from-card to-slate-50 dark:to-slate-900 rounded-2xl border-2 border-border p-6 shadow-soft hover:shadow-xl transition-all">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-3 rounded-xl shadow-lg">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground">New Announcement</h2>
          </div>
          <AnnouncementForm />
        </div>
        <div className="bg-gradient-to-br from-card to-slate-50 dark:to-slate-900 rounded-2xl border-2 border-border p-6 shadow-soft hover:shadow-xl transition-all flex flex-col h-[450px]">
          <div className="flex items-center gap-3 mb-6 flex-shrink-0">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-3 rounded-xl shadow-lg">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground">Recent Announcements</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <AnnouncementList />
          </div>
        </div>
      </div>
    </div>
  );
}