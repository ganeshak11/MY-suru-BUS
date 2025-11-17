import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';

export default function MapPinIcon(props: Omit<ComponentProps<typeof Ionicons>, 'name'>) {
  return <Ionicons name="location" {...props} />;
}
