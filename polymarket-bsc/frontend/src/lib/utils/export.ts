/**
 * Export utilities for trading data
 */

interface ExportData {
  [key: string]: any;
}

/**
 * Convert data array to CSV format
 */
export function convertToCSV(data: ExportData[], headers?: string[]): string {
  if (data.length === 0) return '';

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);

  // Create CSV header row
  const headerRow = csvHeaders.join(',');

  // Create data rows
  const dataRows = data.map((row) => {
    return csvHeaders
      .map((header) => {
        const value = row[header];

        // Handle different data types
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Download data as CSV file
 */
export function downloadCSV(data: ExportData[], filename: string, headers?: string[]): void {
  const csv = convertToCSV(data, headers);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Download data as JSON file
 */
export function downloadJSON(data: ExportData[], filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  downloadBlob(blob, `${filename}.json`);
}

/**
 * Download blob as file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Format trade data for export
 */
export function formatTradesForExport(trades: any[]) {
  return trades.map((trade) => ({
    'Trade ID': trade.id,
    'Market ID': trade.marketId,
    'Date': new Date(trade.createdAt).toLocaleString(),
    'Type': trade.type,
    'Side': trade.side,
    'Outcome': trade.outcome,
    'Price': trade.price,
    'Amount': trade.amount,
    'Total': (trade.price * trade.amount).toFixed(2),
    'Fee': trade.fee || 0,
    'Status': trade.status,
  }));
}

/**
 * Format positions for export
 */
export function formatPositionsForExport(positions: any[]) {
  return positions.map((position) => ({
    'Position ID': position.id,
    'Market ID': position.marketId,
    'Market Title': position.market?.title || '',
    'Outcome': position.outcome,
    'Amount': position.amount,
    'Average Price': position.avgPrice,
    'Current Price': position.currentPrice || 0,
    'Value': (position.amount * (position.currentPrice || position.avgPrice)).toFixed(2),
    'P&L': position.pnl || 0,
    'P&L %': position.pnlPercent || 0,
    'Created': new Date(position.createdAt).toLocaleString(),
    'Updated': new Date(position.updatedAt).toLocaleString(),
  }));
}

/**
 * Format orders for export
 */
export function formatOrdersForExport(orders: any[]) {
  return orders.map((order) => ({
    'Order ID': order.id,
    'Market ID': order.marketId,
    'Type': order.type,
    'Side': order.side,
    'Outcome': order.outcome,
    'Price': order.price,
    'Size': order.size,
    'Filled': order.filled,
    'Remaining': order.size - order.filled,
    'Status': order.status,
    'Created': new Date(order.createdAt).toLocaleString(),
    'Expires': order.expiresAt ? new Date(order.expiresAt).toLocaleString() : 'Never',
  }));
}

/**
 * Generate summary report
 */
export function generateTradingSummary(trades: any[], positions: any[]) {
  const totalTrades = trades.length;
  const totalVolume = trades.reduce((sum, t) => sum + (t.price * t.amount), 0);
  const totalFees = trades.reduce((sum, t) => sum + (t.fee || 0), 0);

  const winningTrades = trades.filter((t) => (t.pnl || 0) > 0).length;
  const losingTrades = trades.filter((t) => (t.pnl || 0) < 0).length;
  const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(2) : '0';

  const totalPnL = positions.reduce((sum, p) => sum + (p.pnl || 0), 0);
  const activePositions = positions.filter((p) => p.status === 'ACTIVE').length;

  return {
    'Total Trades': totalTrades,
    'Total Volume': `$${totalVolume.toFixed(2)}`,
    'Total Fees': `$${totalFees.toFixed(2)}`,
    'Winning Trades': winningTrades,
    'Losing Trades': losingTrades,
    'Win Rate': `${winRate}%`,
    'Total P&L': `$${totalPnL.toFixed(2)}`,
    'Active Positions': activePositions,
    'Generated': new Date().toLocaleString(),
  };
}
