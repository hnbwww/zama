'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

interface Market {
  id: string;
  title: string;
  status: string;
  category: string;
  totalVolume: number;
  createdAt: string;
  _count: {
    trades: number;
    positions: number;
  };
}

export default function AdminMarketsPage() {
  const { address } = useAccount();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  // Fetch markets
  const { data, isLoading } = useQuery({
    queryKey: ['admin-markets', selectedStatus, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      params.append('page', page.toString());
      params.append('limit', '20');

      const res = await fetch(`${API_URL}/admin/markets?${params.toString()}`);
      return res.json();
    },
  });

  // Close market mutation
  const closeMutation = useMutation({
    mutationFn: async (marketId: string) => {
      const res = await fetch(`${API_URL}/admin/markets/${marketId}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-address': address || '',
        },
      });
      if (!res.ok) throw new Error('Failed to close market');
      return res.json();
    },
    onSuccess: () => {
      showToast('Market closed successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['admin-markets'] });
    },
    onError: () => {
      showToast('Failed to close market', 'error');
    },
  });

  // Void market mutation
  const voidMutation = useMutation({
    mutationFn: async ({ marketId, reason }: { marketId: string; reason: string }) => {
      const res = await fetch(`${API_URL}/admin/markets/${marketId}/void`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-address': address || '',
        },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error('Failed to void market');
      return res.json();
    },
    onSuccess: () => {
      showToast('Market voided successfully', 'success');
      setShowVoidModal(false);
      setVoidReason('');
      setSelectedMarket(null);
      queryClient.invalidateQueries({ queryKey: ['admin-markets'] });
    },
    onError: () => {
      showToast('Failed to void market', 'error');
    },
  });

  const handleVoid = () => {
    if (!selectedMarket || !voidReason.trim()) {
      showToast('Please provide a reason', 'error');
      return;
    }
    voidMutation.mutate({ marketId: selectedMarket.id, reason: voidReason });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-green-100 text-green-700';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-700';
      case 'RESOLVING':
        return 'bg-blue-100 text-blue-700';
      case 'RESOLVED':
        return 'bg-purple-100 text-purple-700';
      case 'VOIDED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-primary">
            ← Back to Dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-bold">Market Management</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        {['all', 'OPEN', 'CLOSED', 'RESOLVING', 'RESOLVED', 'VOIDED'].map((status) => (
          <button
            key={status}
            onClick={() => {
              setSelectedStatus(status);
              setPage(1);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              selectedStatus === status
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {status === 'all' ? 'All' : status}
          </button>
        ))}
      </div>

      {/* Markets Table */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-muted-foreground">Loading markets...</p>
          </div>
        ) : data?.data && data.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Market</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Category</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Volume</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Trades</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.data.map((market: Market) => (
                    <tr key={market.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <Link href={`/markets/${market.id}`} className="font-medium hover:text-primary">
                          {market.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {new Date(market.createdAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(market.status)}`}>
                          {market.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{market.category}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        ${Number(market.totalVolume).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        {market._count.trades}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {market.status === 'OPEN' && (
                            <button
                              onClick={() => closeMutation.mutate(market.id)}
                              disabled={closeMutation.isPending}
                              className="rounded bg-orange-600 px-3 py-1 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                            >
                              Close
                            </button>
                          )}
                          {['OPEN', 'CLOSED', 'RESOLVING'].includes(market.status) && (
                            <button
                              onClick={() => {
                                setSelectedMarket(market);
                                setShowVoidModal(true);
                              }}
                              className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                            >
                              Void
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.meta && data.meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t p-4">
                <p className="text-sm text-muted-foreground">
                  Page {data.meta.page} of {data.meta.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded border px-3 py-1 text-sm font-medium hover:bg-muted disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                    disabled={page === data.meta.totalPages}
                    className="rounded border px-3 py-1 text-sm font-medium hover:bg-muted disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-12 text-center text-muted-foreground">
            No markets found
          </div>
        )}
      </div>

      {/* Void Modal */}
      {showVoidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-background p-6">
            <h3 className="mb-4 text-xl font-semibold">Void Market</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              You are about to void: <strong>{selectedMarket?.title}</strong>
            </p>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium">Reason:</label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Explain why this market is being voided..."
                className="w-full rounded-lg border p-3 text-sm"
                rows={4}
              />
            </div>

            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
              ⚠️ <strong>Warning:</strong> This action will void the market and allow users to claim refunds. This cannot be undone.
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowVoidModal(false);
                  setVoidReason('');
                  setSelectedMarket(null);
                }}
                className="flex-1 rounded-lg border px-4 py-2 font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleVoid}
                disabled={!voidReason.trim() || voidMutation.isPending}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {voidMutation.isPending ? 'Voiding...' : 'Void Market'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
