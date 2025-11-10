// src/app/components/SideNav.tsx
'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { ThemeToggleButton } from '@/app/components/ThemeToggleButton';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import HomeIcon from '@/app/components/icons/HomeIcon';
import UsersIcon from '@/app/components/icons/UsersIcon';
import MapIcon from '@/app/components/icons/MapIcon';
import MapPinIcon from '@/app/components/icons/MapPinIcon';
import BusIcon from '@/app/components/icons/BusIcon';
import BusFleetIcon from '@/app/components/icons/BusFleetIcon';
import TripIcon from '@/app/components/icons/TripIcon';
import ClockIcon from '@/app/components/icons/ClockIcon';
import LogoutIcon from '@/app/components/icons/LogoutIcon';
import { Dialog, Transition } from '@headlessui/react';
import { 
  XMarkIcon, 
  ClipboardDocumentListIcon, 
  TruckIcon,
  CalendarDaysIcon,
  MapIcon as HeroMapIcon,
  FlagIcon,
  RectangleGroupIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  MegaphoneIcon,
  HomeIcon as HeroHomeIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HeroHomeIcon },
  { name: 'Live Monitoring', href: '/monitoring', icon: HeroMapIcon },
  { name: 'Trips', href: '/trips', icon: BusFleetIcon },
  { name: 'Schedules', href: '/schedules', icon: CalendarDaysIcon },
  { name: 'Routes', href: '/routes', icon: MapPinIcon }, 
  { name: 'Stops', href: '/stops', icon: FlagIcon },
  { name: 'Buses', href: '/buses', icon: TripIcon },
  { name: 'Drivers', href: '/drivers', icon: UserGroupIcon },
  { name: 'Reports', href: '/reports', icon: ExclamationTriangleIcon },
  { name: 'Announcements', href: '/announcements', icon: MegaphoneIcon },
];

export default function SideNav({ isOpen, onClose, onMouseEnter, onMouseLeave }: { isOpen: boolean; onClose: () => void; onMouseEnter: () => void; onMouseLeave: () => void }) {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-40" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="transition-opacity ease-linear duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-secondary/75" />
        </Transition.Child>

        <div className="fixed inset-0 z-40 flex">
          <Transition.Child
            as={Fragment}
            // SUGGESTION: Slower transition for UX
            enter="transition ease-in-out duration-500 transform" 
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-500 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <Dialog.Panel
              className="relative flex w-full max-w-xs flex-1 flex-col bg-card text-card-foreground border-r border-secondary/20 shadow-xl"
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
            >
              <Transition.Child
                as={Fragment}
                enter="ease-in-out duration-500"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in-out duration-500"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                {/* Close button for mobile/touch users (hidden outside of Dialog context) */}
                <div className="absolute top-0 right-0 -mr-12 pt-2 sm:hidden">
                  <button
                    type="button"
                    className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close sidebar</span>
                    <XMarkIcon className="h-6 w-6 text-foreground" aria-hidden="true" />
                  </button>
                </div>
              </Transition.Child>

              {/* Logo/Brand Header */}
              <div className="h-16 flex items-center justify-center text-2xl font-bold shrink-0 border-b border-secondary/20">
                <span className="text-primary">MY</span>(suru) BUS
              </div>

              {/* Navigation Links */}
              <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    // SUGGESTION: Theme-aware hover effect
                    className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={onClose}
                  >
                    <item.icon className="h-6 w-6 mr-3 shrink-0" />
                    {item.name}
                  </Link>
                ))}
              </nav>

              {/* Footer (Theme Toggle & Logout) */}
              <div className="p-4 border-t border-secondary/20 shrink-0">
                <div className="mb-2">
                    <ThemeToggleButton />
                </div>
                <button
                  onClick={handleLogout}
                  // SUGGESTION: Use danger for logout to stand out
                  className="flex items-center w-full px-2 py-2 text-sm font-medium rounded-md text-foreground hover:bg-danger/10 hover:text-danger transition-colors"
                >
                  <LogoutIcon className="h-6 w-6 mr-3 shrink-0" />
                  Logout
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}