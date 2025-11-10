import { Metadata } from 'next';
import MonitoringDashboard from './components/MonitoringDashboard';

export const metadata: Metadata = {
  title: 'Live Fleet Monitoring',
};

export default function MonitoringPage() {
  return <MonitoringDashboard />;
}
