'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useToast } from '@/components/ui/Toast';

interface Position {
  id: string;
  market: {
    id: string;
    title: string;
    conditionId: string;
    status: string;
    outcome?: number;
  };
  yesBalance: number;
  noBalance: number;
  realizedPnl: number;
}

interface BatchRedeemProps {
  positions: Position[];
  onSuccess?: () => void;
}

export function BatchRedeem({ positions, onSuccess }: BatchRedeemProps) {
  const { address } = useAccount();
  const { showToast } = useToast();
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    onSuccess: () => {
      showToast('Batch redeem successful!', 'success');
      setIsOpen(false);
      setSelectedPositions(new Set());
      onSuccess?.();
    },
  });

  // Filter positions that can be redeemed
  const redeemablePositions = positions.filter(
    (p) => p.market.status === 'RESOLVED' && p.market.outcome !== undefined
  );

  // Filter positions that can be refunded (voided markets)
  const refundablePositions = positions.filter(
    (p) => p.market.status === 'VOIDED'
  );

  const togglePosition = (positionId: string) => {
    const newSelected = new Set(selectedPositions);
    if (newSelected.has(positionId)) {
      newSelected.delete(positionId);
    } else {
      newSelected.add(positionId);
    }
    setSelectedPositions(newSelected);
  };

  const selectAll = (type: 'redeem' | 'refund') => {
    const positions = type === 'redeem' ? redeemablePositions : refundablePositions;
    setSelectedPositions(new Set(positions.map((p) => p.id)));
  };

  const clearAll = () => {
    setSelectedPositions(new Set());
  };

  const handleBatchRedeem = async () => {
    if (!address || selectedPositions.size === 0) {
      showToast('Please select positions to redeem', 'error');
      return;
    }

    try {
      const selected = positions.filter((p) => selectedPositions.has(p.id));
      const conditionIds = selected.map((p) => p.market.conditionId as `0x${string}`);

      // Check if this is redeem or refund
      const isRefund = selected.every((p) => p.market.status === 'VOIDED');

      // Call contract
      writeContract({
        address: process.env.NEXT_PUBLIC_CONDITIONAL_TOKENS_ADDRESS as `0x${string}`,
        abi: [
          {
            name: isRefund ? 'batchClaimVoidRefunds' : 'batchRedeemPositions',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [{ name: 'conditionIds', type: 'bytes32[]' }],
            outputs: [],
          },
        ],
        functionName: isRefund ? 'batchClaimVoidRefunds' : 'batchRedeemPositions',
        args: [conditionIds],
      });
    } catch (error) {
      console.error('Batch redeem error:', error);
      showToast('Failed to redeem positions', 'error');
    }
  };

  const selectedRedeemable = Array.from(selectedPositions).filter((id) =>
    redeemablePositions.some((p) => p.id === id)
  );

  const selectedRefundable = Array.from(selectedPositions).filter((id) =>
    refundablePositions.some((p) => p.id === id)
  );

  const estimatedPayout = positions
    .filter((p) => selectedPositions.has(p.id))
    .reduce((sum, p) => {
      if (p.market.status === 'RESOLVED' && p.market.outcome !== undefined) {
        // Resolved: user gets winning tokens
        return sum + (p.market.outcome === 1 ? p.yesBalance : p.noBalance);
      } else if (p.market.status === 'VOIDED') {
        // Voided: user gets (yes + no) / 2
        return sum + (p.yesBalance + p.noBalance) / 2;
      }
      return sum;
    }, 0);

  if (redeemablePositions.length === 0 && refundablePositions.length === 0) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
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
        >
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </svg>
        Batch Redeem ({redeemablePositions.length + refundablePositions.length})
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-lg bg-background p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Batch Redeem Positions</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 hover:bg-muted"
              >
                ✕
              </button>
            </div>

            {/* Summary */}
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Redeemable</p>
                <p className="mt-1 text-2xl font-bold text-green-600">{redeemablePositions.length}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Refundable (Voided)</p>
                <p className="mt-1 text-2xl font-bold text-orange-600">{refundablePositions.length}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Estimated Payout</p>
                <p className="mt-1 text-2xl font-bold">${estimatedPayout.toFixed(2)}</p>
              </div>
            </div>

            {/* Selection Controls */}
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => selectAll('redeem')}
                className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted"
              >
                Select All Redeemable
              </button>
              <button
                onClick={() => selectAll('refund')}
                className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted"
              >
                Select All Refundable
              </button>
              <button
                onClick={clearAll}
                className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted"
              >
                Clear All
              </button>
              <div className="ml-auto text-sm font-medium">
                {selectedPositions.size} selected
              </div>
            </div>

            {/* Position List */}
            <div className="mb-6 max-h-96 overflow-y-auto rounded-lg border">
              {/* Redeemable Positions */}
              {redeemablePositions.length > 0 && (
                <div>
                  <div className="sticky top-0 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                    ✓ Resolved Markets ({redeemablePositions.length})
                  </div>
                  {redeemablePositions.map((position) => (
                    <label
                      key={position.id}
                      className="flex cursor-pointer items-center gap-3 border-b p-4 hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPositions.has(position.id)}
                        onChange={() => togglePosition(position.id)}
                        className="h-4 w-4"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{position.market.title}</p>
                        <div className="mt-1 flex gap-4 text-sm text-muted-foreground">
                          <span>Outcome: <strong className={position.market.outcome === 1 ? 'text-green-600' : 'text-red-600'}>
                            {position.market.outcome === 1 ? 'YES' : 'NO'}
                          </strong></span>
                          <span>
                            Winning tokens:{' '}
                            <strong>
                              {position.market.outcome === 1 ? position.yesBalance.toFixed(2) : position.noBalance.toFixed(2)}
                            </strong>
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          ${(position.market.outcome === 1 ? position.yesBalance : position.noBalance).toFixed(2)}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {/* Refundable Positions */}
              {refundablePositions.length > 0 && (
                <div>
                  <div className="sticky top-0 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700">
                    ⚠ Voided Markets ({refundablePositions.length})
                  </div>
                  {refundablePositions.map((position) => (
                    <label
                      key={position.id}
                      className="flex cursor-pointer items-center gap-3 border-b p-4 hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPositions.has(position.id)}
                        onChange={() => togglePosition(position.id)}
                        className="h-4 w-4"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{position.market.title}</p>
                        <div className="mt-1 flex gap-4 text-sm text-muted-foreground">
                          <span>YES: {position.yesBalance.toFixed(2)}</span>
                          <span>NO: {position.noBalance.toFixed(2)}</span>
                          <span>Refund: <strong>{((position.yesBalance + position.noBalance) / 2).toFixed(2)}</strong></span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          ${((position.yesBalance + position.noBalance) / 2).toFixed(2)}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 rounded-lg border px-4 py-3 font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchRedeem}
                disabled={selectedPositions.size === 0 || isPending || isConfirming}
                className="flex-1 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending || isConfirming
                  ? 'Processing...'
                  : `Redeem ${selectedPositions.size} Position${selectedPositions.size !== 1 ? 's' : ''}`}
              </button>
            </div>

            {/* Help Text */}
            <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              ℹ️ <strong>How it works:</strong>
              <ul className="ml-4 mt-2 list-disc space-y-1">
                <li>Resolved markets: You'll receive your winning tokens as USDC (1:1)</li>
                <li>Voided markets: You'll receive a proportional refund based on your holdings</li>
                <li>This operation will process all selected positions in a single transaction</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
