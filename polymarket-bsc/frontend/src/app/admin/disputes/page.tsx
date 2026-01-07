'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

interface DisputedRequest {
  id: string;
  conditionId: string;
  question: string;
  proposedOutcome: number;
  proposerAddress: string;
  disputerAddress: string;
  disputeReason: string;
  proposedAt: string;
  disputedAt: string;
  market: {
    id: string;
    title: string;
    category: string;
  };
  disputes: Array<{
    id: string;
    disputerAddress: string;
    reason: string;
    createdAt: string;
  }>;
}

export default function AdminDisputesPage() {
  const { address } = useAccount();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDispute, setSelectedDispute] = useState<DisputedRequest | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [finalOutcome, setFinalOutcome] = useState<number>(1);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  // Fetch disputed requests
  const { data: disputes, isLoading } = useQuery({
    queryKey: ['admin-disputes'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/disputes`);
      return res.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Resolve dispute mutation
  const resolveMutation = useMutation({
    mutationFn: async ({ conditionId, finalOutcome }: { conditionId: string; finalOutcome: number }) => {
      const res = await fetch(`${API_URL}/admin/disputes/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-address': address || '',
        },
        body: JSON.stringify({ conditionId, finalOutcome }),
      });
      if (!res.ok) throw new Error('Failed to resolve dispute');
      return res.json();
    },
    onSuccess: () => {
      showToast('Dispute resolved successfully', 'success');
      setShowResolveModal(false);
      setSelectedDispute(null);
      queryClient.invalidateQueries({ queryKey: ['admin-disputes'] });
    },
    onError: () => {
      showToast('Failed to resolve dispute', 'error');
    },
  });

  const handleResolve = () => {
    if (!selectedDispute) return;
    resolveMutation.mutate({
      conditionId: selectedDispute.conditionId,
      finalOutcome,
    });
  };

  const getOutcomeLabel = (outcome: number) => {
    if (outcome === 0) return 'NO';
    if (outcome === 1) return 'YES';
    return 'INVALID';
  };

  const getOutcomeColor = (outcome: number) => {
    if (outcome === 0) return 'text-red-600';
    if (outcome === 1) return 'text-green-600';
    return 'text-orange-600';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-primary">
            ← Back to Dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-bold">Dispute Resolution</h1>
          <p className="text-muted-foreground">Review and arbitrate disputed Oracle outcomes</p>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading disputes...</p>
        </div>
      ) : disputes && disputes.length > 0 ? (
        <div className="space-y-4">
          {disputes.map((dispute: DisputedRequest) => (
            <div key={dispute.id} className="rounded-lg border bg-card p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{dispute.market.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{dispute.question}</p>
                  <span className="mt-2 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    {dispute.market.category}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedDispute(dispute);
                    setFinalOutcome(dispute.proposedOutcome);
                    setShowResolveModal(true);
                  }}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Resolve Dispute
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Proposal */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="font-semibold">Original Proposal</h4>
                    <span className={`text-lg font-bold ${getOutcomeColor(dispute.proposedOutcome)}`}>
                      {getOutcomeLabel(dispute.proposedOutcome)}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Proposer: </span>
                      <span className="font-mono">{dispute.proposerAddress.slice(0, 6)}...{dispute.proposerAddress.slice(-4)}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Proposed: </span>
                      {new Date(dispute.proposedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Dispute */}
                <div className="rounded-lg border bg-orange-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="font-semibold text-orange-800">Dispute Filed</h4>
                    <span className="rounded-full bg-orange-200 px-2 py-0.5 text-xs font-semibold text-orange-800">
                      ⚠️ Needs Review
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Disputer: </span>
                      <span className="font-mono">{dispute.disputerAddress.slice(0, 6)}...{dispute.disputerAddress.slice(-4)}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Disputed: </span>
                      {new Date(dispute.disputedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dispute Reasons */}
              <div className="mt-4 rounded-lg bg-muted/30 p-4">
                <h4 className="mb-2 font-semibold">Dispute Reasons:</h4>
                {dispute.disputes.map((d) => (
                  <div key={d.id} className="mb-2 border-l-4 border-orange-600 pl-3">
                    <p className="text-sm">{d.reason}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      by {d.disputerAddress.slice(0, 6)}...{d.disputerAddress.slice(-4)} •{' '}
                      {new Date(d.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              {/* Quick Action Buttons */}
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/markets/${dispute.market.id}`}
                  target="_blank"
                  className="flex-1 rounded-lg border px-4 py-2 text-center text-sm font-medium hover:bg-muted"
                >
                  View Market →
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold">No Disputes</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            All Oracle requests are proceeding smoothly. No arbitration needed.
          </p>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && selectedDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-background p-6">
            <h3 className="mb-4 text-xl font-semibold">Resolve Dispute</h3>

            <div className="mb-4 rounded-lg bg-muted p-4">
              <p className="font-medium">{selectedDispute.market.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{selectedDispute.question}</p>
            </div>

            {/* Outcome Selection */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium">Select Final Outcome:</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setFinalOutcome(1)}
                  className={`rounded-lg border-2 p-4 font-semibold transition-colors ${
                    finalOutcome === 1
                      ? 'border-green-600 bg-green-50 text-green-700'
                      : 'border-gray-300 hover:border-green-600'
                  }`}
                >
                  YES
                </button>
                <button
                  onClick={() => setFinalOutcome(0)}
                  className={`rounded-lg border-2 p-4 font-semibold transition-colors ${
                    finalOutcome === 0
                      ? 'border-red-600 bg-red-50 text-red-700'
                      : 'border-gray-300 hover:border-red-600'
                  }`}
                >
                  NO
                </button>
                <button
                  onClick={() => setFinalOutcome(2)}
                  className={`rounded-lg border-2 p-4 font-semibold transition-colors ${
                    finalOutcome === 2
                      ? 'border-orange-600 bg-orange-50 text-orange-700'
                      : 'border-gray-300 hover:border-orange-600'
                  }`}
                >
                  INVALID
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="mb-4 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
              <p className="font-semibold">Arbitration Summary:</p>
              <ul className="ml-4 mt-2 list-disc space-y-1">
                <li>Proposed outcome: <strong>{getOutcomeLabel(selectedDispute.proposedOutcome)}</strong></li>
                <li>Your decision: <strong>{getOutcomeLabel(finalOutcome)}</strong></li>
                <li>
                  {finalOutcome === selectedDispute.proposedOutcome
                    ? 'Proposer was correct. Proposer will receive their bond back + disputer bond.'
                    : 'Disputer was correct. Disputer will receive their bond back + proposer bond.'}
                </li>
              </ul>
            </div>

            <div className="mb-4 rounded-lg bg-orange-50 p-3 text-sm text-orange-800">
              ⚠️ <strong>Important:</strong> This decision is final and will trigger on-chain resolution. Review carefully.
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResolveModal(false);
                  setSelectedDispute(null);
                }}
                className="flex-1 rounded-lg border px-4 py-3 font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={resolveMutation.isPending}
                className="flex-1 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {resolveMutation.isPending ? 'Resolving...' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
