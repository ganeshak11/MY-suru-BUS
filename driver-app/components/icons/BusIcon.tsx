import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';

export function BusIcon(props: Omit<ComponentProps<typeof Ionicons>, 'name'>) {
  return <Ionicons name="bus" {...props} />;
}