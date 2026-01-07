'use client';

import { useState } from 'react';
import { MarketList } from '@/components/market/MarketList';
import { useCategories } from '@/hooks/useMarkets';

export default function MarketsPage() {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const { data: categories } = useCategories();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold">Markets</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="mb-8 space-y-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Search markets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-background p-3"
          />

          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategory('all')}
              className={`rounded-full px-4 py-2 ${
                category === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              All
            </button>
            {categories?.map((cat: any) => (
              <button
                key={cat.name}
                onClick={() => setCategory(cat.name)}
                className={`rounded-full px-4 py-2 ${
                  category === cat.name
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>
        </div>

        {/* Market List */}
        <MarketList
          category={category === 'all' ? undefined : category}
          limit={20}
        />
      </main>
    </div>
  );
}
