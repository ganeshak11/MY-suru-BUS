// src/app/announcements/components/AnnouncementList.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { TrashIcon } from '@heroicons/react/24/outline';
import Modal from '@/app/components/Modal'; // ADDED: Import Modal

interface Announcement {
  announcement_id: number;
  title: string;
  message: string;
  created_at: string;
}

export default function AnnouncementList() {
  const supabase = createClientComponentClient();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ADDED: State for Delete Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (fetchError) {
        setError(`Failed to load announcements: ${fetchError.message}`);
        console.error(fetchError);
      } else if (data) {
        setAnnouncements(data);
      }
      setLoading(false);
    };

    fetchAnnouncements();

    const channel = supabase
      .channel('announcements-list-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements' },
        (payload) => {
          setAnnouncements(current => [payload.new as Announcement, ...current].slice(0, 10));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'announcements' },
        (payload) => {
          setAnnouncements(current => current.filter(a => a.announcement_id !== payload.old.announcement_id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // UPDATED: HandleDelete to open modal
  const handleDeleteClick = (announcement: Announcement) => {
    setAnnouncementToDelete(announcement);
    setIsDeleteModalOpen(true);
    setError(null); // Clear any previous errors
  };

  // ADDED: Confirm Delete function for modal
  const confirmDelete = async () => {
    if (!announcementToDelete) return;

    setError(null); // Clear any previous errors

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('announcement_id', announcementToDelete.announcement_id);

    if (error) {
      console.error('Error deleting announcement:', error);
      setError(`Failed to delete announcement: ${error.message}`);
    } else {
      // Real-time listener will update the list
    }
    
    // Close modal and reset state
    setIsDeleteModalOpen(false);
    setAnnouncementToDelete(null);
  };

  if (loading) {
    return <div className="text-center p-4 text-secondary">Loading announcements...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-danger">{error}</div>;
  }

  if (announcements.length === 0) {
    return <div className="text-center p-4 border border-secondary/50 rounded-lg bg-card text-secondary">No announcements found.</div>;
  }

  return (
    <div className="h-full overflow-y-auto pr-2 space-y-4">
      {announcements.map((item) => (
        <div 
          key={item.announcement_id} 
          className="p-4 border border-secondary/30 rounded-lg bg-background text-foreground shadow-sm hover:shadow-md transition-shadow flex justify-between items-start" 
        >
          <div className="flex-grow">
            <h3 className="font-semibold text-primary">{item.title}</h3>
            <p className="text-sm text-secondary mt-1">{item.message}</p>
            <p className="text-xs text-secondary mt-2">
              {new Date(item.created_at).toLocaleString()}
            </p>
          </div>
          
          <button 
            onClick={() => handleDeleteClick(item)} // UPDATED to use new handler
            className="text-danger hover:text-danger/80 p-1 rounded-full flex-shrink-0 ml-4"
            title="Delete Announcement"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      ))}

      {/* ADDED: Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Delete Announcement">
        {announcementToDelete && (
          <div>
            <p className="text-sm text-secondary">
              Are you sure you want to delete the announcement titled: 
              <strong className="text-foreground ml-1">{announcementToDelete.title}</strong>?
            </p>
            <p className="mt-2 text-sm font-medium text-warning">
              This action cannot be undone. The announcement will be immediately removed from passenger apps.
            </p>
            <div className="mt-6 flex justify-end space-x-4">
              <button 
                type="button" 
                onClick={() => setIsDeleteModalOpen(false)} 
                className="inline-flex w-full justify-center rounded-md border border-secondary bg-card px-4 py-2 text-base font-medium text-foreground shadow-sm hover:bg-card-foreground/5 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={confirmDelete} 
                className="inline-flex w-full justify-center rounded-md border border-transparent bg-danger px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-danger/80 sm:w-auto sm:text-sm"
              >
                Delete
              </button>
            </div>
            {error && <p className="mt-4 text-sm text-danger text-center">{error}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}