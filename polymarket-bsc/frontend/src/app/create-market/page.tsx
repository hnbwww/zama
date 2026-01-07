'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useRouter } from 'next/navigation';

export default function CreateMarketPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'SPORTS',
    resolutionSource: '',
    settlementDate: '',
    initialLiquidity: '1000',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    'SPORTS',
    'POLITICS',
    'CRYPTO',
    'ENTERTAINMENT',
    'FINANCE',
    'TECHNOLOGY',
    'SCIENCE',
    'OTHER',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Step 1: Create market via backend API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/markets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          resolutionSource: formData.resolutionSource,
          settlementDate: new Date(formData.settlementDate).toISOString(),
          creator: address,
          initialLiquidity: parseFloat(formData.initialLiquidity),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create market');
      }

      const market = await response.json();

      // Step 2: In a real implementation, you would also:
      // - Call smart contract to create condition
      // - Initialize AMM pool with liquidity
      // - Handle approvals for collateral token

      // Redirect to the new market
      router.push(`/markets/${market.id}`);
    } catch (err: any) {
      console.error('Error creating market:', err);
      setError(err.message || 'Failed to create market');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-lg border p-8 text-center">
          <h1 className="mb-4 text-2xl font-bold">Create a Market</h1>
          <p className="mb-6 text-muted-foreground">
            Connect your wallet to create a prediction market
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create a Market</h1>
        <p className="mt-2 text-muted-foreground">
          Create a new prediction market for any yes/no question
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="mb-2 block text-sm font-medium">
            Market Question *
          </label>
          <input
            id="title"
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Will Bitcoin reach $100,000 by end of 2024?"
            className="w-full rounded-lg border bg-background p-3"
          />
          <p className="mt-1 text-sm text-muted-foreground">
            Ask a clear yes/no question
          </p>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="mb-2 block text-sm font-medium">
            Description *
          </label>
          <textarea
            id="description"
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Provide context and resolution criteria for this market..."
            rows={4}
            className="w-full rounded-lg border bg-background p-3"
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="mb-2 block text-sm font-medium">
            Category *
          </label>
          <select
            id="category"
            required
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full rounded-lg border bg-background p-3"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Resolution Source */}
        <div>
          <label htmlFor="resolutionSource" className="mb-2 block text-sm font-medium">
            Resolution Source *
          </label>
          <input
            id="resolutionSource"
            type="text"
            required
            value={formData.resolutionSource}
            onChange={(e) =>
              setFormData({ ...formData, resolutionSource: e.target.value })
            }
            placeholder="e.g., CoinMarketCap, Official Results, etc."
            className="w-full rounded-lg border bg-background p-3"
          />
          <p className="mt-1 text-sm text-muted-foreground">
            Source that will be used to determine the outcome
          </p>
        </div>

        {/* Settlement Date */}
        <div>
          <label htmlFor="settlementDate" className="mb-2 block text-sm font-medium">
            Settlement Date *
          </label>
          <input
            id="settlementDate"
            type="datetime-local"
            required
            value={formData.settlementDate}
            onChange={(e) =>
              setFormData({ ...formData, settlementDate: e.target.value })
            }
            min={new Date().toISOString().slice(0, 16)}
            className="w-full rounded-lg border bg-background p-3"
          />
          <p className="mt-1 text-sm text-muted-foreground">
            When the market will be resolved
          </p>
        </div>

        {/* Initial Liquidity */}
        <div>
          <label htmlFor="initialLiquidity" className="mb-2 block text-sm font-medium">
            Initial Liquidity (USDC) *
          </label>
          <input
            id="initialLiquidity"
            type="number"
            required
            min="100"
            step="100"
            value={formData.initialLiquidity}
            onChange={(e) =>
              setFormData({ ...formData, initialLiquidity: e.target.value })
            }
            className="w-full rounded-lg border bg-background p-3"
          />
          <p className="mt-1 text-sm text-muted-foreground">
            Minimum 100 USDC required to create a market
          </p>
        </div>

        {/* Summary */}
        <div className="rounded-lg bg-muted p-4">
          <h3 className="mb-2 font-semibold">Market Summary</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Creation Fee:</span>
              <span>10 USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Initial Liquidity:</span>
              <span>{formData.initialLiquidity} USDC</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Total Required:</span>
              <span>{parseFloat(formData.initialLiquidity) + 10} USDC</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Creating Market...' : 'Create Market'}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          By creating a market, you agree to provide initial liquidity and pay the creation fee
        </p>
      </form>
    </div>
  );
}
