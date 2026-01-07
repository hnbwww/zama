'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

interface HealthCheck {
  timestamp: string;
  status: 'healthy' | 'unhealthy';
  services: {
    database: { status: string; latency?: number; error?: string };
    cache: { status: string; error?: string };
  };
}

interface AdminLog {
  id: string;
  adminAddress: string;
  actionType: string;
  targetType: string;
  targetId: string;
  description: string;
  createdAt: string;
}

export default function AdminMonitoringPage() {
  const [logFilter, setLogFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  // Fetch health check
  const { data: health, isLoading: healthLoading } = useQuery<HealthCheck>({
    queryKey: ['admin-health'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/health`);
      return res.json();
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Fetch admin logs
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['admin-logs', logFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (logFilter !== 'all') params.append('actionType', logFilter);
      params.append('page', page.toString());
      params.append('limit', '20');

      const res = await fetch(`${API_URL}/admin/logs?${params.toString()}`);
      return res.json();
    },
  });

  const getServiceStatusColor = (status: string) => {
    return status === 'healthy' ? 'text-green-600' : 'text-red-600';
  };

  const getServiceStatusBg = (status: string) => {
    return status === 'healthy' ? 'bg-green-100' : 'bg-red-100';
  };

  const actionTypes = [
    'all',
    'MARKET_UPDATE',
    'MARKET_VOID',
    'MARKET_CLOSE',
    'USER_BAN',
    'USER_UNBAN',
    'ORACLE_RESOLVE',
    'ORACLE_DISPUTE',
    'SYSTEM_CONFIG',
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-primary">
          ← Back to Dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-bold">System Monitoring</h1>
        <p className="text-muted-foreground">Health checks, logs, and performance metrics</p>
      </div>

      {/* Health Check */}
      <div className="mb-8 rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-xl font-semibold">System Health</h2>
        {healthLoading ? (
          <div className="text-center">
            <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">Checking system health...</p>
          </div>
        ) : health ? (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  health.status === 'healthy' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {health.status === 'healthy' ? (
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-2xl font-bold capitalize">{health.status}</p>
                  <p className="text-sm text-muted-foreground">
                    Last check: {new Date(health.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Refresh
              </button>
            </div>

            {/* Services Status */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Database */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Database (PostgreSQL)</h3>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getServiceStatusBg(health.services.database.status)} ${getServiceStatusColor(health.services.database.status)}`}>
                    {health.services.database.status}
                  </span>
                </div>
                {health.services.database.latency && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Latency: <strong>{health.services.database.latency}ms</strong>
                  </p>
                )}
                {health.services.database.error && (
                  <p className="mt-2 text-sm text-red-600">{health.services.database.error}</p>
                )}
              </div>

              {/* Cache */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Cache (Redis)</h3>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getServiceStatusBg(health.services.cache.status)} ${getServiceStatusColor(health.services.cache.status)}`}>
                    {health.services.cache.status}
                  </span>
                </div>
                {health.services.cache.error && (
                  <p className="mt-2 text-sm text-red-600">{health.services.cache.error}</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground">Unable to fetch health status</p>
        )}
      </div>

      {/* Admin Activity Logs */}
      <div className="rounded-lg border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Admin Activity Logs</h2>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-2">
          {actionTypes.map((type) => (
            <button
              key={type}
              onClick={() => {
                setLogFilter(type);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                logFilter === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {type === 'all' ? 'All' : type.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Logs Table */}
        {logsLoading ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-muted-foreground">Loading logs...</p>
          </div>
        ) : logs?.data && logs.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Timestamp</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Admin</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.data.map((log: AdminLog) => (
                    <tr key={log.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm">
                        <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">
                        {log.adminAddress.slice(0, 6)}...{log.adminAddress.slice(-4)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                          {log.actionType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {log.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {logs.meta && logs.meta.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Page {logs.meta.page} of {logs.meta.totalPages} ({logs.meta.total} total logs)
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
                    onClick={() => setPage((p) => Math.min(logs.meta.totalPages, p + 1))}
                    disabled={page === logs.meta.totalPages}
                    className="rounded border px-3 py-1 text-sm font-medium hover:bg-muted disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            No logs found
          </div>
        )}
      </div>
    </div>
  );
}
