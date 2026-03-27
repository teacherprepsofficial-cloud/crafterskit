"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

interface Suggestion {
  name: string;
  designer: string;
}

const CHIPS = [
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
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestBoxRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`);
    if (!res.ok) return;
    const data = await res.json();
    setSuggestions(data.suggestions ?? []);
  }, []);

  function handleQueryChange(val: string) {
    setQuery(val);
    setShowSuggestions(true);
    setActiveIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      pickSuggestion(suggestions[activeIndex].name);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  }

  // Close suggestions on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        suggestBoxRef.current &&
        !suggestBoxRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleSearch(q: string) {
    if (!q.trim()) return;
    setShowSuggestions(false);
    setSuggestions([]);
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
      if (!res.ok) throw new Error("Search failed");
      const data: SearchResponse = await res.json();
      setResults(data.patterns || []);
      setTotal(data.paginator?.results || 0);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSearch(query);
  }

  function pickSuggestion(name: string) {
    setQuery(name);
    setShowSuggestions(false);
    setSuggestions([]);
    setActiveIndex(-1);
    handleSearch(name);
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
          <form onSubmit={handleSubmit} className="flex gap-2 relative">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="e.g. cozy cabled sweater in worsted weight for women"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#9b2335] focus:border-transparent"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestBoxRef}
                  className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden"
                >
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={() => pickSuggestion(s.name)}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`w-full text-left px-4 py-2.5 border-b border-gray-100 last:border-0 ${i === activeIndex ? "bg-gray-100" : "hover:bg-gray-50"}`}
                    >
                      <span className="text-sm font-medium text-gray-900">{s.name}</span>
                      {s.designer && (
                        <span className="text-xs text-gray-400 ml-2">by {s.designer}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
              {CHIPS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setQuery(s); handleSearch(s); }}
                  className="text-sm bg-white border border-gray-200 text-gray-600 hover:border-[#9b2335] hover:text-[#9b2335] px-3 py-1.5 rounded-full transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

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
