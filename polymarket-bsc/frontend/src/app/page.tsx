import Link from 'next/link';
import { MarketList } from '@/components/market/MarketList';
import { PlatformStats } from '@/components/market/PlatformStats';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold">
              Polymarket BSC
            </Link>
            <nav className="flex items-center gap-4">
              <Link href="/markets" className="hover:text-primary">
                Markets
              </Link>
              <Link href="/portfolio" className="hover:text-primary">
                Portfolio
              </Link>
              <div id="wallet-button"></div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="mb-12 text-center">
          <h1 className="mb-4 text-5xl font-bold">
            Trade on Future Events
          </h1>
          <p className="mb-8 text-xl text-muted-foreground">
            The world's leading decentralized prediction market on BSC
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/markets"
              className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90"
            >
              Explore Markets
            </Link>
            <Link
              href="/markets/create"
              className="rounded-lg border px-6 py-3 font-semibold hover:bg-accent"
            >
              Create Market
            </Link>
          </div>
        </section>

        {/* Platform Stats */}
        <PlatformStats />

        {/* Trending Markets */}
        <section className="mt-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-3xl font-bold">Trending Markets</h2>
            <Link href="/markets" className="text-primary hover:underline">
              View All →
            </Link>
          </div>
          <MarketList limit={6} />
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 Polymarket BSC. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
