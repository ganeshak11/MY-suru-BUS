// src/app/announcements/components/AnnouncementForm.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AnnouncementForm() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      setError('Title and message cannot be empty.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    const { error: insertError } = await supabase
      .from('announcements')
      .insert({ title, message });

    setIsSubmitting(false);

    if (insertError) {
      setError(`Error sending announcement: ${insertError.message}`);
    } else {
      setSuccess(true);
      setTitle('');
      setMessage('');
      // Note: No need to explicitly tell the list to update, as it's listening in real-time!
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded-lg bg-card shadow-lg space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1 text-secondary">Title</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 border border-secondary/50 rounded-md bg-background text-foreground focus:border-primary focus:ring-primary"
          placeholder="e.g., Service Update"
        />
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium mb-1 text-secondary">Message</label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full p-2 border border-secondary/50 rounded-md bg-background text-foreground focus:border-primary focus:ring-primary"
          rows={4}
          placeholder="e.g., Route 5 will be temporarily diverted..."
        />
      </div>
      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-4 py-2 font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/80 disabled:bg-secondary/50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Sending...' : 'Send Announcement'}
        </button>
      </div>
      {/* Theme-aware status messages */}
      {error && <p className="text-sm text-danger">{error}</p>}
      {success && <p className="text-sm text-success">Announcement sent successfully!</p>}
    </form>
  );
}