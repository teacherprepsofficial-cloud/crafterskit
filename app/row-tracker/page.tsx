"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Row {
  id: number;
  label: string;
  instruction: string;
}

interface PatternData {
  title: string;
  craft: string;
  rows: Row[];
  notes: string;
}

const STORAGE_KEY = "crafterskit_tracker";

function loadSaved(): { pattern: PatternData; completed: number[] } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveToBrowser(pattern: PatternData, completed: number[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ pattern, completed }));
  } catch {}
}

export default function RowTrackerPage() {
  const [text, setText] = useState("");
  const [pattern, setPattern] = useState<PatternData | null>(null);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"input" | "tracker">("input");
  const currentRef = useRef<HTMLDivElement>(null);

  // Load saved state on mount
  useEffect(() => {
    const saved = loadSaved();
    if (saved) {
      setPattern(saved.pattern);
      setCompleted(new Set(saved.completed));
      setView("tracker");
    }
  }, []);

  // Scroll current row into view
  useEffect(() => {
    if (view === "tracker" && currentRef.current) {
      currentRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [completed, view]);

  async function handleParse() {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/parse-pattern", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setPattern(data);
      setCompleted(new Set());
      saveToBrowser(data, []);
      setView("tracker");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function toggleRow(id: number) {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (pattern) saveToBrowser(pattern, Array.from(next));
      return next;
    });
  }

  function handleReset() {
    setCompleted(new Set());
    if (pattern) saveToBrowser(pattern, []);
  }

  function handleNewPattern() {
    setPattern(null);
    setCompleted(new Set());
    setText("");
    setView("input");
    localStorage.removeItem(STORAGE_KEY);
  }

  const totalRows = pattern?.rows.length ?? 0;
  const doneCount = completed.size;
  const pct = totalRows > 0 ? Math.round((doneCount / totalRows) * 100) : 0;
  const currentRowId = pattern?.rows.find(r => !completed.has(r.id))?.id ?? null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
        <Link href="/" className="text-xl font-bold text-gray-900">CraftersKit</Link>
        <Link href="/gauge-calculator" className="text-sm text-gray-400 hover:text-[#e11d48] transition-colors font-medium">Gauge Calculator</Link>
        <Link href="/chart-converter" className="text-sm text-gray-400 hover:text-[#e11d48] transition-colors font-medium">Chart Converter</Link>
        <Link href="/photo-to-pattern" className="text-sm text-gray-400 hover:text-[#e11d48] transition-colors font-medium">Photo to Pattern</Link>
        <Link href="/written-to-chart" className="text-sm text-gray-400 hover:text-[#e11d48] transition-colors font-medium">Written to Chart</Link>
        <span className="text-sm text-[#e11d48] font-medium">Row Tracker</span>
      </header>

      {view === "input" ? (
        <main className="max-w-2xl mx-auto px-4 py-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Row Tracker</h2>
          <p className="text-gray-500 text-lg mb-8">Paste your pattern and track every row as you go. Your progress saves automatically.</p>

          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={12}
            placeholder="Paste your knitting or crochet pattern here..."
            className="w-full border border-gray-300 rounded-xl px-5 py-4 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#e11d48] resize-none leading-relaxed"
          />

          {error && <p className="mt-3 text-red-500 text-sm">{error}</p>}

          <button
            onClick={handleParse}
            disabled={loading || !text.trim()}
            className="mt-4 w-full bg-[#e11d48] hover:bg-[#be123c] disabled:bg-gray-300 text-white text-lg font-bold px-6 py-4 rounded-xl transition-colors"
          >
            {loading ? "Parsing pattern…" : "Start Tracking →"}
          </button>
        </main>
      ) : pattern ? (
        <div className="max-w-2xl mx-auto px-4 py-6">

          {/* Header + progress */}
          <div className="mb-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 leading-tight">{pattern.title}</h2>
                <p className="text-gray-400 text-sm mt-1">{pattern.craft}</p>
              </div>
              <button
                onClick={handleNewPattern}
                className="text-sm text-gray-400 hover:text-gray-600 whitespace-nowrap pt-1"
              >
                New pattern
              </button>
            </div>

            {/* Big progress bar */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-end justify-between mb-3">
                <span className="text-5xl font-black text-gray-900">{doneCount}<span className="text-2xl font-normal text-gray-400"> / {totalRows}</span></span>
                <span className="text-3xl font-bold text-[#e11d48]">{pct}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                <div
                  className="h-4 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: pct === 100 ? "#16a34a" : "#e11d48" }}
                />
              </div>
              <p className="text-sm text-gray-400 mt-2">
                {pct === 100 ? "🎉 Pattern complete!" : `${totalRows - doneCount} rows remaining`}
              </p>
            </div>

            {doneCount > 0 && pct < 100 && (
              <button onClick={handleReset} className="mt-2 text-xs text-gray-400 hover:text-red-500 transition-colors">
                Reset progress
              </button>
            )}
          </div>

          {/* Notes */}
          {pattern.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6">
              <p className="text-sm text-amber-800 leading-relaxed"><strong className="font-semibold">Notes:</strong> {pattern.notes}</p>
            </div>
          )}

          {/* Row list */}
          <div className="space-y-3">
            {pattern.rows.map((row) => {
              const isDone = completed.has(row.id);
              const isCurrent = row.id === currentRowId;

              return (
                <div
                  key={row.id}
                  ref={isCurrent ? currentRef : null}
                  onClick={() => toggleRow(row.id)}
                  className={`rounded-2xl border-2 px-6 py-5 cursor-pointer transition-all duration-200 select-none
                    ${isDone
                      ? "border-gray-200 bg-gray-50 opacity-50"
                      : isCurrent
                      ? "border-[#e11d48] bg-white shadow-lg shadow-rose-100"
                      : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                >
                  <div className="flex items-start gap-5">
                    {/* Checkbox */}
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors
                      ${isDone ? "bg-[#e11d48] border-[#e11d48]" : isCurrent ? "border-[#e11d48]" : "border-gray-300"}`}
                    >
                      {isDone && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Row label — BIG */}
                      <div className={`text-xl font-bold mb-1 ${isDone ? "text-gray-400" : isCurrent ? "text-[#e11d48]" : "text-gray-700"}`}>
                        {row.label}
                      </div>
                      {/* Instruction — large, readable */}
                      <p className={`text-lg leading-relaxed ${isDone ? "line-through text-gray-400" : "text-gray-800"}`}>
                        {row.instruction}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {pct === 100 && (
            <div className="mt-8 bg-green-50 border border-green-200 rounded-2xl px-6 py-8 text-center">
              <div className="text-5xl mb-3">🎉</div>
              <h3 className="text-2xl font-bold text-green-800 mb-1">Pattern complete!</h3>
              <p className="text-green-600 mb-4">Amazing work finishing <strong>{pattern.title}</strong>.</p>
              <button onClick={handleReset} className="text-sm text-green-600 underline">Start again from Row 1</button>
            </div>
          )}

          <div className="mt-10 mb-4">
            <button
              onClick={handleNewPattern}
              className="w-full border border-gray-200 rounded-xl py-3 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors text-sm"
            >
              Load a new pattern
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
