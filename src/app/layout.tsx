import type { Metadata } from 'next';
import { AIProvider  } from '@/lib/ai-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Influencer Platform',
  description: 'Discover top influencers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white">
       <AIProvider>
        {children}
       </AIProvider>
      </body>
    </html>
  );
}
