'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

interface User {
  address: string;
  totalTrades: number;
  totalVolume: number;
  totalPnl: number;
  isAdmin: boolean;
  isBanned: boolean;
  banReason?: string;
  firstSeen: string;
  lastActive: string;
}

export default function AdminUsersPage() {
  const { address } = useAccount();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [sortBy, setSortBy] = useState<'volume' | 'pnl' | 'trades'>('volume');
  const [filterBanned, setFilterBanned] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [showBanModal, setShowBanModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [banReason, setBanReason] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  // Fetch users
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', sortBy, filterBanned, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('sortBy', sortBy);
      if (filterBanned !== 'all') params.append('isBanned', filterBanned);
      params.append('page', page.toString());
      params.append('limit', '20');

      const res = await fetch(`${API_URL}/admin/users?${params.toString()}`);
      return res.json();
    },
  });

  // Ban user mutation
  const banMutation = useMutation({
    mutationFn: async ({ userAddress, reason }: { userAddress: string; reason: string }) => {
      const res = await fetch(`${API_URL}/admin/users/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-address': address || '',
        },
        body: JSON.stringify({ userAddress, reason }),
      });
      if (!res.ok) throw new Error('Failed to ban user');
      return res.json();
    },
    onSuccess: () => {
      showToast('User banned successfully', 'success');
      setShowBanModal(false);
      setBanReason('');
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => {
      showToast('Failed to ban user', 'error');
    },
  });

  // Unban user mutation
  const unbanMutation = useMutation({
    mutationFn: async (userAddress: string) => {
      const res = await fetch(`${API_URL}/admin/users/unban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-address': address || '',
        },
        body: JSON.stringify({ userAddress }),
      });
      if (!res.ok) throw new Error('Failed to unban user');
      return res.json();
    },
    onSuccess: () => {
      showToast('User unbanned successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => {
      showToast('Failed to unban user', 'error');
    },
  });

  const handleBan = () => {
    if (!selectedUser || !banReason.trim()) {
      showToast('Please provide a reason', 'error');
      return;
    }
    banMutation.mutate({ userAddress: selectedUser.address, reason: banReason });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-primary">
            ← Back to Dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-bold">User Management</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <div className="flex gap-2">
          <span className="flex items-center text-sm font-medium">Sort by:</span>
          {(['volume', 'pnl', 'trades'] as const).map((sort) => (
            <button
              key={sort}
              onClick={() => {
                setSortBy(sort);
                setPage(1);
              }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                sortBy === sort
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {sort === 'volume' ? 'Volume' : sort === 'pnl' ? 'PnL' : 'Trades'}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-2">
          <span className="flex items-center text-sm font-medium">Filter:</span>
          {['all', 'false', 'true'].map((filter) => (
            <button
              key={filter}
              onClick={() => {
                setFilterBanned(filter);
                setPage(1);
              }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filterBanned === filter
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {filter === 'all' ? 'All' : filter === 'true' ? 'Banned' : 'Active'}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-muted-foreground">Loading users...</p>
          </div>
        ) : data?.data && data.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Address</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Volume</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">PnL</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Trades</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.data.map((user: User) => (
                    <tr key={user.address} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {user.address.slice(0, 6)}...{user.address.slice(-4)}
                          </span>
                          {user.isAdmin && (
                            <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Active: {new Date(user.lastActive).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ${Number(user.totalVolume).toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${
                        Number(user.totalPnl) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${Number(user.totalPnl).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">{user.totalTrades}</td>
                      <td className="px-4 py-3 text-center">
                        {user.isBanned ? (
                          <div className="flex flex-col items-center">
                            <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                              Banned
                            </span>
                            {user.banReason && (
                              <p className="mt-1 text-xs text-muted-foreground">{user.banReason}</p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!user.isAdmin && (
                          <>
                            {user.isBanned ? (
                              <button
                                onClick={() => unbanMutation.mutate(user.address)}
                                disabled={unbanMutation.isPending}
                                className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                              >
                                Unban
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowBanModal(true);
                                }}
                                className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                              >
                                Ban
                              </button>
                            )}
                          </>
                        )}
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
            No users found
          </div>
        )}
      </div>

      {/* Ban Modal */}
      {showBanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-background p-6">
            <h3 className="mb-4 text-xl font-semibold">Ban User</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              You are about to ban user: <strong className="font-mono">{selectedUser?.address}</strong>
            </p>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium">Reason:</label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Explain why this user is being banned..."
                className="w-full rounded-lg border p-3 text-sm"
                rows={4}
              />
            </div>

            <div className="mb-4 rounded-lg bg-orange-50 p-3 text-sm text-orange-800">
              ⚠️ <strong>Note:</strong> Banned users will not be able to create orders or interact with the platform.
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBanModal(false);
                  setBanReason('');
                  setSelectedUser(null);
                }}
                className="flex-1 rounded-lg border px-4 py-2 font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleBan}
                disabled={!banReason.trim() || banMutation.isPending}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {banMutation.isPending ? 'Banning...' : 'Ban User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
