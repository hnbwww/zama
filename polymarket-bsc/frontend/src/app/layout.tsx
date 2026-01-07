import '@/styles/globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { MobileNav } from '@/components/layout/MobileNav';
import { QuickSearch } from '@/components/ui/QuickSearch';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Polymarket BSC - Decentralized Prediction Market',
  description: 'Trade on the outcome of future events on BSC',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <MobileNav />
          {children}
          <QuickSearch />
        </Providers>
      </body>
    </html>
  );
}
