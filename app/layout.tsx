import type { Metadata } from 'next';
import './globals.css';
import { ClientCleanup } from '@/components/layout/client-cleanup';

export const metadata: Metadata = {
  title: 'Studio GFX Photography — Team Management System',
  description: 'Enterprise staff attendance, photography/video workflow, productivity points and team management system.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-amber-100 selection:text-amber-900"
        suppressHydrationWarning
      >
        <ClientCleanup />
        {children}
      </body>
    </html>
  );
}

