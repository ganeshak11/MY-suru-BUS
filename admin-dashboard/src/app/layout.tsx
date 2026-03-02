import type { Metadata } from 'next';
import ClientLayout from './ClientLayout';
import './globals.css';
import 'leaflet/dist/leaflet.css'; // Replaces the unpkg CDN link

export const metadata: Metadata = {
  title: 'MY(suru) BUS — Admin Dashboard',
  description: 'Fleet management and monitoring for MY(suru) BUS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
      </head>
      <body className="h-full">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}