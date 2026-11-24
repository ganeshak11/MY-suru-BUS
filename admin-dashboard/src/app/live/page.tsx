import type { Metadata } from 'next';
import LiveView from './LiveView';

export const metadata: Metadata = {
  title: 'Live buses · MY(suru) BUS',
  description: 'Live positions, stops passed and arrival estimates for every running MY(suru) BUS trip in Mysuru.',
};

export default function LivePage() {
  return <LiveView />;
}
