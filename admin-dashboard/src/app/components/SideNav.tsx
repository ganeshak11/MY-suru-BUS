// src/app/components/SideNav.tsx
'use client';

import { Fragment } from 'react';
import Link from 'next/link';
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
              className="relative flex w-full max-w-xs flex-1 flex-col bg-gradient-to-b from-card via-card to-slate-50 dark:to-slate-900 text-card-foreground border-r-2 border-primary/20 shadow-2xl"
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
              <div className="relative h-24 flex items-center justify-center text-2xl font-bold shrink-0 border-b-2 border-primary/20 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10"></div>
                <div className="relative flex items-center gap-3">
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-3 rounded-2xl shadow-lg transform hover:scale-110 transition-transform">
                    <TruckIcon className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <div className="text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">MY(suru) BUS</div>
                    <div className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Admin Portal</div>
                  </div>
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="group relative flex items-center px-4 py-3.5 text-sm font-semibold rounded-xl text-foreground hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 hover:text-white transition-all duration-300 hover:shadow-lg hover:translate-x-2 overflow-hidden"
                    onClick={onClose}
                  >
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative flex items-center w-full">
                      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10 group-hover:bg-white/20 transition-all group-hover:scale-110">
                        <item.icon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="ml-3">{item.name}</span>
                      <svg className="ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </nav>

              {/* Footer (Logout) */}
              <div className="p-4 border-t-2 border-primary/20 shrink-0 bg-gradient-to-t from-slate-50/50 dark:from-slate-900/50">
                <button
                  onClick={handleLogout}
                  className="group relative flex items-center w-full px-4 py-3.5 text-sm font-semibold rounded-xl text-foreground hover:bg-gradient-to-r hover:from-red-600 hover:to-rose-600 hover:text-white transition-all duration-300 hover:shadow-lg overflow-hidden"
                >
                  <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative flex items-center w-full">
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-red-500/10 group-hover:bg-white/20 transition-all">
                      <LogoutIcon className="h-5 w-5" />
                    </div>
                    <span className="ml-3">Logout</span>
                  </div>
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}