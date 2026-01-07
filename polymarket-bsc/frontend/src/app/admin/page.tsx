'use client';

import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

interface SystemStats {
  markets: { total: number; active: number };
  users: { total: number; active: number };
  trading: { totalVolume: number; totalTrades: number };
  oracle: { disputed: number };
  recentActions: any[];
}

export default function AdminDashboard() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  // Verify admin status
  const { data: adminVerify, isLoading: verifyLoading } = useQuery({
    queryKey: ['admin-verify', address],
    queryFn: async () => {
      if (!address) return { isAdmin: false };
      const res = await fetch(`${API_URL}/admin/verify/${address}`);
      return res.json();
    },
    enabled: !!address,
  });

  // Fetch system stats
  const { data: stats, isLoading: statsLoading } = useQuery<SystemStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/stats`);
      return res.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
    if (adminVerify && !adminVerify.isAdmin && !verifyLoading) {
      router.push('/');
    }
  }, [isConnected, adminVerify, verifyLoading, router]);

  if (verifyLoading || statsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!adminVerify?.isAdmin) {
    return null; // Will redirect
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage markets, users, and system settings</p>
      </div>

      {/* Quick Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Markets</p>
              <p className="mt-2 text-3xl font-bold">{stats?.markets.total || 0}</p>
              <p className="mt-1 text-sm text-green-600">{stats?.markets.active || 0} active</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Users</p>
              <p className="mt-2 text-3xl font-bold">{stats?.users.total || 0}</p>
              <p className="mt-1 text-sm text-green-600">{stats?.users.active || 0} active</p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Volume</p>
              <p className="mt-2 text-3xl font-bold">${Number(stats?.trading.totalVolume || 0).toLocaleString()}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stats?.trading.totalTrades || 0} trades</p>
            </div>
            <div className="rounded-full bg-purple-100 p-3">
              <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Disputed Oracles</p>
              <p className="mt-2 text-3xl font-bold">{stats?.oracle.disputed || 0}</p>
              <p className="mt-1 text-sm text-orange-600">Needs attention</p>
            </div>
            <div className="rounded-full bg-orange-100 p-3">
              <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Management Sections */}
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <Link
          href="/admin/markets"
          className="rounded-lg border bg-card p-6 transition-colors hover:bg-muted"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold">Market Management</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Update, close, or void markets. Edit market information and manage listings.
              </p>
            </div>
            <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        <Link
          href="/admin/users"
          className="rounded-lg border bg-card p-6 transition-colors hover:bg-muted"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold">User Management</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                View user statistics, manage permissions, and handle moderation actions.
              </p>
            </div>
            <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        <Link
          href="/admin/disputes"
          className="rounded-lg border bg-card p-6 transition-colors hover:bg-muted"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold">Dispute Resolution</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Review and resolve disputed Oracle outcomes. Manage arbitration process.
              </p>
            </div>
            <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        <Link
          href="/admin/monitoring"
          className="rounded-lg border bg-card p-6 transition-colors hover:bg-muted"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold">System Monitoring</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                View health checks, logs, and performance metrics. Monitor system status.
              </p>
            </div>
            <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>

      {/* Recent Admin Actions */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-xl font-semibold">Recent Admin Actions</h3>
        <div className="space-y-3">
          {stats?.recentActions && stats.recentActions.length > 0 ? (
            stats.recentActions.slice(0, 10).map((action: any) => (
              <div key={action.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                <div>
                  <p className="font-medium">{action.description}</p>
                  <p className="text-sm text-muted-foreground">
                    by {action.adminAddress.slice(0, 6)}...{action.adminAddress.slice(-4)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-muted-foreground">
                    {new Date(action.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(action.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground">No recent actions</p>
          )}
        </div>
      </div>
    </div>
  );
}
