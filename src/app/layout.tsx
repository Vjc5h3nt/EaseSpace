import type { Metadata } from 'next';
import './globals.css';
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/toaster";
import { FirebaseProvider } from '@/firebase/provider';

export const metadata: Metadata = {
  title: 'EaseSpace',
  description: 'Seamless Space Booking for the Modern Workplace',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
      </head>
      <body className="font-body antialiased">
        <FirebaseProvider>
          {children}
        </FirebaseProvider>
        <Analytics />
        <Toaster />
      </body>
    </html>
  );
}
