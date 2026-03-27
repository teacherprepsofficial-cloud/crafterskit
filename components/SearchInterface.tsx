"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import PatternCard from "./PatternCard";

interface Pattern {
  id: number;
  name: string;
  designer: { name: string };
  first_photo?: { small_url: string };
  craft?: { name: string };
  yarn_weight?: { name: string };
  free: boolean;
  rating_average: number;
  projects_count: number;
}

interface SearchResponse {
  patterns: Pattern[];
  paginator: { results: number };
}

const SUGGESTIONS = [
  "cozy oversized sweater with cables, worsted weight",
  "quick baby hat in fingering weight",
  "lace shawl for beginners, free pattern",
  "crochet granny square blanket",
  "colorwork mittens with Nordic pattern",
  "simple ribbed socks, DK weight",
];

export default function SearchInterface({ username }: { username: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Pattern[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setError("");
    setResults(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });

      if (res.status === 401) {
        window.location.href = "/";
        return;
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(`Error: ${errData.error ?? "unknown"} — status:${errData.status} detail:${errData.detail}`);
        return;
      }
      const data: SearchResponse = await res.json();
      setResults(data.patterns || []);
      setTotal(data.paginator?.results || 0);
    } catch (e) {
      setError(`Something went wrong: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSearch(query);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">CraftersKit</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">@{username}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Search box */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Find your next pattern
          </h2>
          <p className="text-gray-500 mb-4">
            Describe what you want in plain English — no filters needed.
          </p>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. cozy cabled sweater in worsted weight for women"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#9b2335] focus:border-transparent"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-[#9b2335] hover:bg-[#7d1c2a] disabled:bg-gray-300 text-white font-semibold px-6 py-3 rounded-lg transition-colors whitespace-nowrap"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </form>

          {/* Suggestion chips */}
          {!results && (
            <div className="flex flex-wrap gap-2 mt-3">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setQuery(s);
                    handleSearch(s);
                  }}
                  className="text-sm bg-white border border-gray-200 text-gray-600 hover:border-[#9b2335] hover:text-[#9b2335] px-3 py-1.5 rounded-full transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg overflow-hidden animate-pulse">
                <div className="bg-gray-200 aspect-square" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {results && !loading && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {total.toLocaleString()} patterns found
            </p>
            {results.length === 0 ? (
              <p className="text-gray-500">No patterns found. Try a different description.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {results.map((pattern) => (
                  <PatternCard key={pattern.id} pattern={pattern} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
