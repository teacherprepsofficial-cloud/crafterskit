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
  interpreted_as?: string;
}

interface Suggestion {
  name: string;
  designer: string;
}


function highlightSuggestion(name: string, typed: string) {
  const t = typed.trim();
  if (!t) return <span>{name}</span>;
  const lower = name.toLowerCase();
  const idx = lower.indexOf(t.toLowerCase());
  if (idx === -1) return <strong>{name}</strong>;
  return (
    <>
      {idx > 0 && <strong>{name.slice(0, idx)}</strong>}
      <span>{name.slice(idx, idx + t.length)}</span>
      {idx + t.length < name.length && <strong>{name.slice(idx + t.length)}</strong>}
    </>
  );
}

export default function SearchInterface({ username }: { username: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Pattern[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [interpretedAs, setInterpretedAs] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestBoxRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typedQueryRef = useRef("");

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`);
    if (!res.ok) return;
    const data = await res.json();
    setSuggestions(data.suggestions ?? []);
  }, []);

  function handleQueryChange(val: string) {
    typedQueryRef.current = val;
    setQuery(val);
    setShowSuggestions(true);
    setActiveIndex(-1);
    if (val) clearImage();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  }

  function navigateToIndex(newIndex: number) {
    setActiveIndex(newIndex);
    const name = newIndex === -1 ? typedQueryRef.current : suggestions[newIndex].name;
    setQuery(name);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(name), 150);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      navigateToIndex((activeIndex + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      navigateToIndex(activeIndex <= 0 ? -1 : activeIndex - 1);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      pickSuggestion(suggestions[activeIndex].name);
    } else if (e.key === "Escape") {
      setQuery(typedQueryRef.current);
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  }

  function clearImage() {
    setImagePreview(null);
    setImageData(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function loadImageFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setQuery("");
    typedQueryRef.current = "";
    setSuggestions([]);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      const [meta, base64] = dataUrl.split(",");
      const mimeType = meta.match(/:(.*?);/)?.[1] ?? "image/jpeg";
      setImageData({ base64, mimeType });
    };
    reader.readAsDataURL(file);
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) loadImageFile(file);
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setDragging(false);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef.current = 0;
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadImageFile(file);
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

  async function handleSearch(q: string, imgData?: { base64: string; mimeType: string } | null) {
    const searchImage = imgData ?? imageData;
    if (!q.trim() && !searchImage) return;
    setShowSuggestions(false);
    setSuggestions([]);
    setLoading(true);
    setError("");
    setResults(null);
    setInterpretedAs(null);

    try {
      const body = searchImage
        ? { image: searchImage.base64, mimeType: searchImage.mimeType }
        : { query: q };

      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        window.location.href = "/";
        return;
      }
      if (!res.ok) throw new Error("Search failed");
      const data: SearchResponse = await res.json();
      setResults(data.patterns || []);
      setTotal(data.paginator?.results || 0);
      setInterpretedAs(data.interpreted_as ?? null);
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
    <div
      className="min-h-screen bg-gray-50 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Full-page drop overlay */}
      {dragging && (
        <div className="fixed inset-0 z-50 bg-[#9b2335]/10 border-4 border-dashed border-[#9b2335] flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-2xl px-10 py-8 shadow-xl flex flex-col items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[#9b2335]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-lg font-semibold text-gray-800">Drop image to search</p>
          </div>
        </div>
      )}
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
            Describe what you want, or upload a photo of a garment to find its pattern.
          </p>

          {/* Image preview */}
          {imagePreview && (
            <div className="mb-3 flex items-center gap-3">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Search by image" className="h-16 w-16 object-cover rounded-lg border border-gray-200" />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute -top-1.5 -right-1.5 bg-gray-700 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs leading-none"
                >
                  ×
                </button>
              </div>
              <span className="text-sm text-gray-500">Searching by image…</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2 relative">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder={imagePreview ? "Image selected — hit Search" : "e.g. cozy cabled sweater in worsted weight for women"}
                disabled={!!imagePreview}
                className="w-full border border-gray-300 rounded-lg pl-4 pr-12 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#9b2335] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
              />
              {/* Camera button inside input */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#9b2335] transition-colors"
                title="Search by image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
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
                      <span className="text-sm text-gray-900">{highlightSuggestion(s.name, typedQueryRef.current)}</span>
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
              disabled={loading || (!query.trim() && !imageData)}
              className="bg-[#9b2335] hover:bg-[#7d1c2a] disabled:bg-gray-300 text-white font-semibold px-6 py-3 rounded-lg transition-colors whitespace-nowrap"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </form>

        </div>

        {/* Interpreted as */}
        {interpretedAs && !loading && (
          <p className="text-xs text-gray-400 mb-4">Interpreted as: {interpretedAs}</p>
        )}

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

