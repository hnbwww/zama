'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useUserPositions, useUserTrades, useUserStats, useUserOrders } from '@/hooks/useTrading';
import Link from 'next/link';
import {
  downloadCSV,
  downloadJSON,
  formatTradesForExport,
  formatPositionsForExport,
  formatOrdersForExport,
  generateTradingSummary,
} from '@/lib/utils/export';

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { data: positions } = useUserPositions();
  const { data: trades } = useUserTrades(50);
  const { data: stats } = useUserStats();
  const { data: orders } = useUserOrders();
  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'history'>('positions');
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExportCSV = () => {
    const timestamp = new Date().toISOString().split('T')[0];

    if (activeTab === 'positions' && positions) {
      const formatted = formatPositionsForExport(positions);
      downloadCSV(formatted, `positions-${timestamp}`);
    } else if (activeTab === 'orders' && orders) {
      const formatted = formatOrdersForExport(orders);
      downloadCSV(formatted, `orders-${timestamp}`);
    } else if (activeTab === 'history' && trades) {
      const formatted = formatTradesForExport(trades);
      downloadCSV(formatted, `trades-${timestamp}`);
    }
    setShowExportMenu(false);
  };

  const handleExportJSON = () => {
    const timestamp = new Date().toISOString().split('T')[0];

    if (activeTab === 'positions' && positions) {
      const formatted = formatPositionsForExport(positions);
      downloadJSON(formatted, `positions-${timestamp}`);
    } else if (activeTab === 'orders' && orders) {
      const formatted = formatOrdersForExport(orders);
      downloadJSON(formatted, `orders-${timestamp}`);
    } else if (activeTab === 'history' && trades) {
      const formatted = formatTradesForExport(trades);
      downloadJSON(formatted, `trades-${timestamp}`);
    }
    setShowExportMenu(false);
  };

  const handleExportSummary = () => {
    if (trades && positions) {
      const summary = generateTradingSummary(trades, positions);
      const timestamp = new Date().toISOString().split('T')[0];
      downloadJSON([summary], `trading-summary-${timestamp}`);
    }
    setShowExportMenu(false);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="rounded-lg border p-12 text-center">
            <h1 className="mb-4 text-3xl font-bold">Portfolio</h1>
            <p className="mb-6 text-muted-foreground">
              Connect your wallet to view your portfolio
            </p>
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold">Portfolio</h1>
              <div className="text-sm text-muted-foreground">
                {address}
              </div>
            </div>

            {/* Export Menu */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export Data
              </button>

              {showExportMenu && (
                <div className="absolute right-0 z-10 mt-2 w-56 rounded-lg border bg-background shadow-lg">
                  <div className="p-2">
                    <button
                      onClick={handleExportCSV}
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-muted"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                      Export as CSV
                    </button>
                    <button
                      onClick={handleExportJSON}
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-muted"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                      </svg>
                      Export as JSON
                    </button>
                    <div className="my-1 border-t" />
                    <button
                      onClick={handleExportSummary}
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-muted"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="3" y1="9" x2="21" y2="9" />
                        <line x1="9" y1="21" x2="9" y2="9" />
                      </svg>
                      Export Summary Report
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-6">
            <div className="text-sm text-muted-foreground">Total Trades</div>
            <div className="mt-2 text-3xl font-bold">{stats?.totalTrades || 0}</div>
          </div>
          <div className="rounded-lg border p-6">
            <div className="text-sm text-muted-foreground">Total Volume</div>
            <div className="mt-2 text-3xl font-bold">
              ${(stats?.totalVolume || 0).toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg border p-6">
            <div className="text-sm text-muted-foreground">Total P&L</div>
            <div className={`mt-2 text-3xl font-bold ${
              (stats?.totalPnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              ${(stats?.totalPnl || 0).toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg border p-6">
            <div className="text-sm text-muted-foreground">Active Positions</div>
            <div className="mt-2 text-3xl font-bold">{positions?.length || 0}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('positions')}
              className={`px-4 py-2 font-semibold ${
                activeTab === 'positions'
                  ? 'border-b-2 border-primary'
                  : 'text-muted-foreground'
              }`}
            >
              Positions
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 font-semibold ${
                activeTab === 'orders'
                  ? 'border-b-2 border-primary'
                  : 'text-muted-foreground'
              }`}
            >
              Orders
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 font-semibold ${
                activeTab === 'history'
                  ? 'border-b-2 border-primary'
                  : 'text-muted-foreground'
              }`}
            >
              History
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'positions' && (
          <div className="rounded-lg border">
          <div className="border-b p-4">
            <h2 className="text-xl font-semibold">Your Positions</h2>
          </div>
          <div>
            {positions && positions.length > 0 ? (
              positions.map((position: any) => (
                <div key={position.id} className="border-b p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Link
                        href={`/markets/${position.market.id}`}
                        className="font-semibold hover:text-primary"
                      >
                        {position.market.title}
                      </Link>
                      <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">YES: </span>
                          <span className="font-mono">{position.yesBalance.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">NO: </span>
                          <span className="font-mono">{position.noBalance.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Realized P&L</div>
                      <div className={`text-lg font-semibold ${
                        position.realizedPnl >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${position.realizedPnl.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                No positions yet. Start trading to see your positions here.
              </div>
            )}
          </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="rounded-lg border">
            <div className="border-b p-4">
              <h2 className="text-xl font-semibold">Your Orders</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium">Market</th>
                    <th className="p-3 text-left text-sm font-medium">Type</th>
                    <th className="p-3 text-left text-sm font-medium">Outcome</th>
                    <th className="p-3 text-right text-sm font-medium">Price</th>
                    <th className="p-3 text-right text-sm font-medium">Size</th>
                    <th className="p-3 text-right text-sm font-medium">Filled</th>
                    <th className="p-3 text-left text-sm font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders && orders.length > 0 ? (
                    orders.map((order: any) => (
                      <tr key={order.id} className="border-b">
                        <td className="p-3 text-sm">
                          <Link href={`/markets/${order.market.id}`} className="hover:text-primary">
                            {order.market.title.substring(0, 40)}...
                          </Link>
                        </td>
                        <td className="p-3 text-sm">{order.type}</td>
                        <td className="p-3">
                          <span className={`rounded px-2 py-1 text-xs font-medium ${
                            order.outcome === 'YES'
                              ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                          }`}>
                            {order.outcome}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-sm">${order.price.toFixed(3)}</td>
                        <td className="p-3 text-right font-mono text-sm">{order.size.toFixed(0)}</td>
                        <td className="p-3 text-right font-mono text-sm">{order.filled.toFixed(0)}</td>
                        <td className="p-3 text-sm">
                          <span className={`rounded px-2 py-1 text-xs font-medium ${
                            order.status === 'ACTIVE'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-muted-foreground">
                        No orders yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="rounded-lg border">
            <div className="border-b p-4">
              <h2 className="text-xl font-semibold">Trading History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium">Date</th>
                    <th className="p-3 text-left text-sm font-medium">Market</th>
                    <th className="p-3 text-left text-sm font-medium">Type</th>
                    <th className="p-3 text-left text-sm font-medium">Outcome</th>
                    <th className="p-3 text-right text-sm font-medium">Price</th>
                    <th className="p-3 text-right text-sm font-medium">Size</th>
                    <th className="p-3 text-right text-sm font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {trades && trades.length > 0 ? (
                    trades.map((trade: any) => (
                      <tr key={trade.id} className="border-b">
                        <td className="p-3 text-sm text-muted-foreground">
                          {new Date(trade.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-sm">
                          <Link href={`/markets/${trade.market.id}`} className="hover:text-primary">
                            {trade.market.title.substring(0, 40)}...
                          </Link>
                        </td>
                        <td className="p-3 text-sm">{trade.type}</td>
                        <td className="p-3">
                          <span className={`rounded px-2 py-1 text-xs font-medium ${
                            trade.outcome === 'YES'
                              ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                          }`}>
                            {trade.outcome}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-sm">${trade.price.toFixed(3)}</td>
                        <td className="p-3 text-right font-mono text-sm">{trade.size.toFixed(0)}</td>
                        <td className="p-3 text-right font-mono text-sm">
                          ${(trade.price * trade.size).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-muted-foreground">
                        No trades yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
