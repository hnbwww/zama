'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SearchResult {
  id: string;
  title: string;
  category: string;
  yesPrice?: number;
}

export function QuickSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Search markets
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const debounce = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/markets?search=${encodeURIComponent(query)}&limit=5`
        );
        const data = await response.json();
        setResults(data.markets || []);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [query]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90 lg:hidden"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        Search
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setIsOpen(false)}>
      <div
        className="container mx-auto mt-20 max-w-2xl px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-lg border bg-background shadow-2xl">
          {/* Search Input */}
          <div className="flex items-center gap-3 border-b p-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-muted-foreground"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search markets..."
              className="flex-1 bg-transparent text-lg outline-none"
            />
            <kbd className="rounded border px-2 py-1 text-xs text-muted-foreground">ESC</kbd>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading && (
              <div className="p-8 text-center text-muted-foreground">
                Searching...
              </div>
            )}

            {!isLoading && query && results.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No markets found
              </div>
            )}

            {!isLoading && results.length > 0 && (
              <div className="p-2">
                {results.map((result) => (
                  <Link
                    key={result.id}
                    href={`/markets/${result.id}`}
                    onClick={() => setIsOpen(false)}
                    className="block rounded-lg p-3 hover:bg-muted"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{result.title}</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {result.category}
                        </div>
                      </div>
                      {result.yesPrice !== undefined && (
                        <div className="ml-4 flex flex-col items-end text-sm">
                          <span className="text-green-600 dark:text-green-400">
                            {(result.yesPrice * 100).toFixed(1)}% YES
                          </span>
                          <span className="text-red-600 dark:text-red-400">
                            {((1 - result.yesPrice) * 100).toFixed(1)}% NO
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Quick Links */}
            {!query && (
              <div className="p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Quick Actions
                </div>
                <div className="space-y-1">
                  <Link
                    href="/markets"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 rounded-lg p-3 hover:bg-muted"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                    <span>Browse All Markets</span>
                  </Link>
                  <Link
                    href="/create-market"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 rounded-lg p-3 hover:bg-muted"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Create New Market</span>
                  </Link>
                  <Link
                    href="/portfolio"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 rounded-lg p-3 hover:bg-muted"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>View Portfolio</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t p-3 text-xs text-muted-foreground">
            <div>
              <kbd className="rounded border px-2 py-1">↑</kbd>{' '}
              <kbd className="rounded border px-2 py-1">↓</kbd> to navigate
            </div>
            <div>
              <kbd className="rounded border px-2 py-1">⌘</kbd>+
              <kbd className="rounded border px-2 py-1">K</kbd> to open
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
