import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';

export default function UsersIcon(props: Omit<ComponentProps<typeof Ionicons>, 'name'>) {
  return <Ionicons name="people" {...props} />;
}
