// src/app/components/SideNav.tsx
'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/apiClient';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeToggleButton } from '@/app/components/ThemeToggleButton';
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

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    apiClient.logout();
    router.replace('/login');
  };

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border/60 px-5">
        <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 p-2 shadow">
          <TruckIcon className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <div className="leading-tight">
          <div className="text-base font-extrabold text-foreground">MY(suru) BUS</div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-secondary">Admin</div>
        </div>
      </div>

      {/* Links */}
      <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                active
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-foreground hover:bg-primary/10'
              }`}
            >
              <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="flex shrink-0 items-center gap-2 border-t border-border/60 p-3">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-red-500/10 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
        >
          <LogoutIcon className="h-5 w-5" />
          {isLoggingOut ? 'Signing out…' : 'Sign out'}
        </button>
        <ThemeToggleButton />
      </div>
    </div>
  );
}

// Permanent sidebar on large screens; slide-in drawer (opened from the menu
// button in the layout) on smaller ones.
export default function SideNav({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-border/60 bg-card text-card-foreground lg:block">
        <div className="sticky top-0 h-screen">
          <NavContent />
        </div>
      </aside>

      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-out duration-200 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in duration-150 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative w-72 max-w-[85vw] bg-card text-card-foreground shadow-2xl">
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute right-2 top-3 rounded-lg p-2 text-secondary hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="sr-only">Close menu</span>
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                </button>
                <NavContent onNavigate={onClose} />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
}
