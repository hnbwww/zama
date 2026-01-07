'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { useToast } from '@/components/ui/Toast';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface Comment {
  id: string;
  marketId: string;
  userAddress: string;
  content: string;
  parentId: string | null;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  replies?: Comment[];
  reactions?: { type: 'UPVOTE' | 'DOWNVOTE'; userAddress: string }[];
}

interface CommentSectionProps {
  marketId: string;
}

export function CommentSection({ marketId }: CommentSectionProps) {
  const { address, isConnected } = useAccount();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  // Fetch comments
  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', marketId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/comments/market/${marketId}`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json() as Promise<Comment[]>;
    },
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async (data: { content: string; parentId?: string }) => {
      const response = await fetch(`${API_URL}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId,
          userAddress: address,
          content: data.content,
          parentId: data.parentId,
        }),
      });
      if (!response.ok) throw new Error('Failed to create comment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', marketId] });
      setNewComment('');
      setReplyTo(null);
      setReplyContent('');
      showToast('Comment posted successfully', 'success');
    },
    onError: () => {
      showToast('Failed to post comment', 'error');
    },
  });

  // React to comment mutation
  const reactMutation = useMutation({
    mutationFn: async (data: { commentId: string; type: 'UPVOTE' | 'DOWNVOTE' }) => {
      const response = await fetch(`${API_URL}/comments/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId: data.commentId,
          userAddress: address,
          type: data.type,
        }),
      });
      if (!response.ok) throw new Error('Failed to react');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', marketId] });
    },
  });

  const handleSubmitComment = () => {
    if (!newComment.trim()) {
      showToast('Comment cannot be empty', 'error');
      return;
    }
    createCommentMutation.mutate({ content: newComment });
  };

  const handleSubmitReply = (parentId: string) => {
    if (!replyContent.trim()) {
      showToast('Reply cannot be empty', 'error');
      return;
    }
    createCommentMutation.mutate({ content: replyContent, parentId });
  };

  const getUserReaction = (comment: Comment): 'UPVOTE' | 'DOWNVOTE' | null => {
    if (!address || !comment.reactions) return null;
    const reaction = comment.reactions.find((r) => r.userAddress === address);
    return reaction ? reaction.type : null;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const userReaction = getUserReaction(comment);

    return (
      <div key={comment.id} className={`${isReply ? 'ml-12 mt-3' : 'mt-4'}`}>
        <div className="rounded-lg border bg-card p-4">
          {/* Comment Header */}
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {comment.userAddress.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="font-mono text-sm font-medium">
                  {comment.userAddress.slice(0, 6)}...{comment.userAddress.slice(-4)}
                </div>
                <div className="text-xs text-muted-foreground">{formatTimeAgo(comment.createdAt)}</div>
              </div>
            </div>
          </div>

          {/* Comment Content */}
          <div className="mb-3 text-sm">{comment.content}</div>

          {/* Comment Actions */}
          <div className="flex items-center gap-4 text-sm">
            {/* Upvote */}
            <button
              onClick={() => isConnected && reactMutation.mutate({ commentId: comment.id, type: 'UPVOTE' })}
              disabled={!isConnected}
              className={`flex items-center gap-1 ${
                userReaction === 'UPVOTE' ? 'text-green-600 font-semibold' : 'text-muted-foreground hover:text-green-600'
              }`}
            >
              ▲ {comment.upvotes}
            </button>

            {/* Downvote */}
            <button
              onClick={() => isConnected && reactMutation.mutate({ commentId: comment.id, type: 'DOWNVOTE' })}
              disabled={!isConnected}
              className={`flex items-center gap-1 ${
                userReaction === 'DOWNVOTE' ? 'text-red-600 font-semibold' : 'text-muted-foreground hover:text-red-600'
              }`}
            >
              ▼ {comment.downvotes}
            </button>

            {/* Reply Button */}
            {!isReply && isConnected && (
              <button
                onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                className="text-muted-foreground hover:text-primary"
              >
                💬 Reply
              </button>
            )}
          </div>

          {/* Reply Input */}
          {replyTo === comment.id && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 rounded-lg border px-3 py-2 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitReply(comment.id);
                  }
                }}
              />
              <button
                onClick={() => handleSubmitReply(comment.id)}
                disabled={createCommentMutation.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Reply
              </button>
            </div>
          )}
        </div>

        {/* Render Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            {comment.replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="mb-4 text-xl font-semibold">Discussion ({comments?.length || 0})</h2>

      {/* New Comment Input */}
      {isConnected ? (
        <div className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts on this market..."
            className="w-full rounded-lg border p-3 text-sm"
            rows={3}
          />
          <div className="mt-2 flex justify-end">
            <button
              onClick={handleSubmitComment}
              disabled={createCommentMutation.isPending || !newComment.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {createCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-lg border border-dashed p-6 text-center">
          <p className="mb-4 text-sm text-muted-foreground">Connect your wallet to join the discussion</p>
          <ConnectButton />
        </div>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading comments...</div>
      ) : comments && comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) => renderComment(comment))}
        </div>
      ) : (
        <div className="py-12 text-center text-muted-foreground">
          No comments yet. Be the first to share your thoughts!
        </div>
      )}
    </div>
  );
}
