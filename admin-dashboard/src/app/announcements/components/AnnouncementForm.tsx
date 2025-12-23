// src/app/announcements/components/AnnouncementForm.tsx
'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/apiClient';

export default function AnnouncementForm() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();
    
    if (!trimmedTitle || !trimmedMessage) {
      setError('Title and message cannot be empty.');
      return;
    }
    
    if (trimmedTitle.length > 100) {
      setError('Title must be 100 characters or less.');
      return;
    }
    
    if (trimmedMessage.length > 500) {
      setError('Message must be 500 characters or less.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await apiClient.createAnnouncement({ title: trimmedTitle, message: trimmedMessage });
      setSuccess(true);
      setTitle('');
      setMessage('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      setError(`Error sending announcement: ${error.message}`);
    }
    
    setIsSubmitting(false);
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
          maxLength={100}
          className="w-full p-2 border border-secondary/50 rounded-md bg-background text-foreground focus:border-primary focus:ring-primary"
          placeholder="e.g., Service Update"
          aria-describedby="title-hint"
        />
        <p id="title-hint" className="text-xs text-secondary mt-1">{title.length}/100 characters</p>
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium mb-1 text-secondary">Message</label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          className="w-full p-2 border border-secondary/50 rounded-md bg-background text-foreground focus:border-primary focus:ring-primary resize-y"
          rows={4}
          placeholder="e.g., Route 5 will be temporarily diverted..."
          aria-describedby="message-hint"
        />
        <p id="message-hint" className="text-xs text-secondary mt-1">{message.length}/500 characters</p>
      </div>
      <div>
        <button
          type="submit"
          disabled={isSubmitting || !title.trim() || !message.trim()}
          className="w-full px-4 py-2 font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/80 disabled:bg-secondary/50 disabled:cursor-not-allowed transition-colors"
          aria-busy={isSubmitting}
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