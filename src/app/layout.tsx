import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StockVision — Real-time Stock Analytics',
  description: 'Professional stock trading analytics platform with real-time data, charting, and portfolio simulation.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-zinc-950 text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
