'use client';

// Note: There is no 'BusIcon' in Heroicons, so we use 'TruckIcon' as a replacement.
import { TruckIcon as HeroTruckIcon } from '@heroicons/react/24/outline';

export default function BusIcon(props: React.ComponentProps<typeof HeroTruckIcon>) {
  return <HeroTruckIcon {...props} />;
}