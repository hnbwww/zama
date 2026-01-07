'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useToast } from '@/components/ui/Toast';

interface OracleStatusProps {
  marketId: string;
  conditionId: string;
}

enum OracleRequestStatus {
  REQUESTED = 'REQUESTED',
  PROPOSED = 'PROPOSED',
  DISPUTED = 'DISPUTED',
  RESOLVED = 'RESOLVED',
  VOIDED = 'VOIDED',
}

export function OracleStatus({ marketId, conditionId }: OracleStatusProps) {
  const { address } = useAccount();
  const { showToast } = useToast();
  const [proposedOutcome, setProposedOutcome] = useState<number>(1); // Default to YES
  const [disputeReason, setDisputeReason] = useState('');
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  // Fetch Oracle status
  const { data: oracleStatus, refetch } = useQuery({
    queryKey: ['oracle-status', marketId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/oracle/market-status/${marketId}`);
      if (!response.ok) return null;
      return response.json();
    },
    refetchInterval: 10000, // Refetch every 10s
  });

  const { writeContract, data: hash, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Propose outcome (contract call)
  const handlePropose = async () => {
    if (!address) {
      showToast('Please connect wallet', 'error');
      return;
    }

    try {
      // Call contract
      writeContract({
        address: process.env.NEXT_PUBLIC_ORACLE_ADDRESS as `0x${string}`,
        abi: [
          {
            name: 'proposeOutcome',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'conditionId', type: 'bytes32' },
              { name: 'outcome', type: 'uint256' },
            ],
            outputs: [],
          },
        ],
        functionName: 'proposeOutcome',
        args: [conditionId as `0x${string}`, BigInt(proposedOutcome)],
      });

      // Update backend
      await fetch(`${API_URL}/oracle/propose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conditionId,
          outcome: proposedOutcome,
          proposerAddress: address,
        }),
      });

      showToast('Proposal submitted successfully', 'success');
      setShowProposeModal(false);
      refetch();
    } catch (error) {
      console.error('Propose error:', error);
      showToast('Failed to propose outcome', 'error');
    }
  };

  // Dispute outcome (contract call)
  const handleDispute = async () => {
    if (!address) {
      showToast('Please connect wallet', 'error');
      return;
    }

    try {
      // Call contract
      writeContract({
        address: process.env.NEXT_PUBLIC_ORACLE_ADDRESS as `0x${string}`,
        abi: [
          {
            name: 'disputeOutcome',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'conditionId', type: 'bytes32' },
              { name: 'reason', type: 'string' },
            ],
            outputs: [],
          },
        ],
        functionName: 'disputeOutcome',
        args: [conditionId as `0x${string}`, disputeReason],
      });

      // Update backend
      await fetch(`${API_URL}/oracle/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conditionId,
          disputerAddress: address,
          reason: disputeReason,
        }),
      });

      showToast('Dispute submitted successfully', 'success');
      setShowDisputeModal(false);
      refetch();
    } catch (error) {
      console.error('Dispute error:', error);
      showToast('Failed to dispute outcome', 'error');
    }
  };

  // Finalize resolution (contract call)
  const handleFinalize = async () => {
    if (!address) {
      showToast('Please connect wallet', 'error');
      return;
    }

    try {
      // Call contract
      writeContract({
        address: process.env.NEXT_PUBLIC_ORACLE_ADDRESS as `0x${string}`,
        abi: [
          {
            name: 'finalizeResolution',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [{ name: 'conditionId', type: 'bytes32' }],
            outputs: [],
          },
        ],
        functionName: 'finalizeResolution',
        args: [conditionId as `0x${string}`],
      });

      // Update backend
      await fetch(`${API_URL}/oracle/finalize/${conditionId}`, {
        method: 'POST',
      });

      showToast('Resolution finalized successfully', 'success');
      refetch();
    } catch (error) {
      console.error('Finalize error:', error);
      showToast('Failed to finalize resolution', 'error');
    }
  };

  if (!oracleStatus) {
    return null;
  }

  const getStatusColor = (status: OracleRequestStatus) => {
    switch (status) {
      case OracleRequestStatus.REQUESTED:
        return 'bg-gray-100 text-gray-700';
      case OracleRequestStatus.PROPOSED:
        return 'bg-blue-100 text-blue-700';
      case OracleRequestStatus.DISPUTED:
        return 'bg-orange-100 text-orange-700';
      case OracleRequestStatus.RESOLVED:
        return 'bg-green-100 text-green-700';
      case OracleRequestStatus.VOIDED:
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getOutcomeLabel = (outcome: number) => {
    if (outcome === 0) return 'NO';
    if (outcome === 1) return 'YES';
    return 'INVALID';
  };

  const formatTimeRemaining = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="mb-4 text-xl font-semibold">Oracle Resolution Status</h2>

      {/* Status Badge */}
      <div className="mb-4">
        <span className={`inline-block rounded-full px-4 py-2 text-sm font-semibold ${getStatusColor(oracleStatus.status)}`}>
          {oracleStatus.status}
        </span>
      </div>

      {/* Status Details */}
      <div className="space-y-3 text-sm">
        {oracleStatus.status === OracleRequestStatus.PROPOSED && (
          <>
            <div>
              <span className="text-muted-foreground">Proposed Outcome: </span>
              <span className={`font-semibold ${oracleStatus.proposedOutcome === 1 ? 'text-green-600' : 'text-red-600'}`}>
                {getOutcomeLabel(oracleStatus.proposedOutcome)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Proposer: </span>
              <span className="font-mono">{oracleStatus.proposerAddress?.slice(0, 6)}...{oracleStatus.proposerAddress?.slice(-4)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Challenge Deadline: </span>
              <span className="font-semibold">
                {formatTimeRemaining(oracleStatus.timeUntilDeadline)} remaining
              </span>
            </div>
          </>
        )}

        {oracleStatus.status === OracleRequestStatus.DISPUTED && (
          <>
            <div>
              <span className="text-muted-foreground">Proposed Outcome: </span>
              <span className="font-semibold">{getOutcomeLabel(oracleStatus.proposedOutcome)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Disputer: </span>
              <span className="font-mono">{oracleStatus.disputerAddress?.slice(0, 6)}...{oracleStatus.disputerAddress?.slice(-4)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Dispute Reason: </span>
              <span>{oracleStatus.disputeReason}</span>
            </div>
            <div className="rounded-lg bg-orange-50 p-3 text-orange-800">
              ⚠️ This proposal is under dispute. Awaiting arbitration.
            </div>
          </>
        )}

        {oracleStatus.status === OracleRequestStatus.RESOLVED && (
          <div>
            <span className="text-muted-foreground">Final Outcome: </span>
            <span className={`text-lg font-bold ${oracleStatus.finalOutcome === 1 ? 'text-green-600' : 'text-red-600'}`}>
              {getOutcomeLabel(oracleStatus.finalOutcome)}
            </span>
          </div>
        )}

        {oracleStatus.status === OracleRequestStatus.VOIDED && (
          <div className="rounded-lg bg-red-50 p-3 text-red-800">
            ❌ This market has been voided. Reason: {oracleStatus.voidReason || 'N/A'}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3">
        {oracleStatus.status === OracleRequestStatus.REQUESTED && (
          <button
            onClick={() => setShowProposeModal(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Propose Outcome
          </button>
        )}

        {oracleStatus.status === OracleRequestStatus.PROPOSED && oracleStatus.timeUntilDeadline > 0 && (
          <button
            onClick={() => setShowDisputeModal(true)}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
          >
            Dispute Proposal
          </button>
        )}

        {oracleStatus.canFinalize && (
          <button
            onClick={handleFinalize}
            disabled={isPending || isConfirming}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isPending || isConfirming ? 'Finalizing...' : 'Finalize Resolution'}
          </button>
        )}
      </div>

      {/* Propose Modal */}
      {showProposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-background p-6">
            <h3 className="mb-4 text-xl font-semibold">Propose Outcome</h3>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium">Select Outcome:</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setProposedOutcome(1)}
                  className={`flex-1 rounded-lg border-2 p-3 font-semibold transition-colors ${
                    proposedOutcome === 1
                      ? 'border-green-600 bg-green-50 text-green-700'
                      : 'border-gray-300 hover:border-green-600'
                  }`}
                >
                  YES
                </button>
                <button
                  onClick={() => setProposedOutcome(0)}
                  className={`flex-1 rounded-lg border-2 p-3 font-semibold transition-colors ${
                    proposedOutcome === 0
                      ? 'border-red-600 bg-red-50 text-red-700'
                      : 'border-gray-300 hover:border-red-600'
                  }`}
                >
                  NO
                </button>
                <button
                  onClick={() => setProposedOutcome(2)}
                  className={`flex-1 rounded-lg border-2 p-3 font-semibold transition-colors ${
                    proposedOutcome === 2
                      ? 'border-orange-600 bg-orange-50 text-orange-700'
                      : 'border-gray-300 hover:border-orange-600'
                  }`}
                >
                  INVALID
                </button>
              </div>
            </div>

            <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              ℹ️ You will need to deposit a bond. If your proposal is correct, you'll get it back. If disputed and wrong, you'll lose it.
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowProposeModal(false)}
                className="flex-1 rounded-lg border px-4 py-2 font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handlePropose}
                disabled={isPending || isConfirming}
                className="flex-1 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending || isConfirming ? 'Submitting...' : 'Submit Proposal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-background p-6">
            <h3 className="mb-4 text-xl font-semibold">Dispute Proposal</h3>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium">Dispute Reason:</label>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Explain why this proposal is incorrect..."
                className="w-full rounded-lg border p-3 text-sm"
                rows={4}
              />
            </div>

            <div className="mb-4 rounded-lg bg-orange-50 p-3 text-sm text-orange-800">
              ⚠️ You will need to deposit a dispute bond. If you're correct, you'll get it back plus the proposer's bond. If wrong, you'll lose it.
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDisputeModal(false)}
                className="flex-1 rounded-lg border px-4 py-2 font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleDispute}
                disabled={!disputeReason.trim() || isPending || isConfirming}
                className="flex-1 rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {isPending || isConfirming ? 'Submitting...' : 'Submit Dispute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
