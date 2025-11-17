import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';

export default function HomeIcon(props: Omit<ComponentProps<typeof Ionicons>, 'name'>) {
  return <Ionicons name="home" {...props} />;
}
