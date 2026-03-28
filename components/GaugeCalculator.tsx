"use client";
import { useState, useCallback } from "react";
import Link from "next/link";

// ── types ─────────────────────────────────────────────────────────────────────
interface Gauge {
  stitches: string;
  rows: string;
  unit: "inch" | "4inch";
}

// ── helpers ───────────────────────────────────────────────────────────────────
function perInch(v: number, unit: "inch" | "4inch") {
  return unit === "4inch" ? v / 4 : v;
}
function toMeters(yards: number) {
  return Math.round(yards * 0.9144);
}
function pct(scale: number) {
  const p = Math.abs((scale - 1) * 100);
  const dir = scale > 1 ? "more" : scale < 1 ? "fewer" : "same";
  return { p: p.toFixed(1), dir };
}
function scaleColor(scale: number | null) {
  if (scale === null) return "text-gray-300";
  if (Math.abs(scale - 1) < 0.02) return "text-emerald-600";
  return scale > 1 ? "text-blue-600" : "text-amber-600";
}

// ── GaugeCard ─────────────────────────────────────────────────────────────────
function GaugeCard({
  title,
  subtitle,
  value,
  onChange,
  accent,
}: {
  title: string;
  subtitle: string;
  value: Gauge;
  onChange: (g: Gauge) => void;
  accent?: boolean;
}) {
  const ring = accent ? "focus:ring-[#9b2335]" : "focus:ring-gray-400";
  const border = accent ? "border-[#9b2335]" : "border-gray-200";
  const inputBorder = accent ? "border-[#9b2335]/30" : "border-gray-200";
  return (
    <div className={`bg-white rounded-2xl border ${border} p-5 shadow-sm`}>
      <div className="mb-4">
        <h3 className={`text-sm font-semibold ${accent ? "text-[#9b2335]" : "text-gray-900"}`}>{title}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 mb-4 w-full text-xs">
        {(["4inch", "inch"] as const).map((u) => (
          <button
            key={u}
            onClick={() => onChange({ ...value, unit: u })}
            className={`flex-1 py-1.5 rounded-md font-medium transition-all ${
              value.unit === u ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {u === "4inch" ? "per 4 in / 10 cm" : "per inch"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {[
          { key: "stitches" as const, label: "Stitches", placeholder: "e.g. 20" },
          { key: "rows" as const, label: "Rows / Rounds", placeholder: "e.g. 28" },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="text-xs text-gray-500 mb-1 block">{label}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="0.5"
                placeholder={placeholder}
                value={value[key]}
                onChange={(e) => onChange({ ...value, [key]: e.target.value })}
                className={`w-28 border ${inputBorder} rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${ring} transition-all`}
              />
              <span className="text-xs text-gray-400">
                {key === "stitches" ? "sts" : "rows"} {value.unit === "4inch" ? "per 4 in" : "per in"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ScaleBar ──────────────────────────────────────────────────────────────────
function ScaleBar({ scale, label }: { scale: number; label: string }) {
  const base = 120;
  const barW = Math.max(20, Math.min(200, base * scale));
  const { p, dir } = pct(scale);
  const color = Math.abs(scale - 1) < 0.02 ? "#10b981" : scale > 1 ? "#3b82f6" : "#f59e0b";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{label}</span>
        <span className={`text-xs font-semibold ${scaleColor(scale)}`}>
          {scale.toFixed(3)}× {dir !== "same" ? `(${p}% ${dir})` : "(perfect match)"}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, (barW / 200) * 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ── StatBox ───────────────────────────────────────────────────────────────────
function StatBox({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color ?? "text-gray-900"}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

// ── QuickTab ──────────────────────────────────────────────────────────────────
function QuickTab({
  stitchScale,
  rowScale,
}: {
  stitchScale: number | null;
  rowScale: number | null;
}) {
  const [origYardage, setOrigYardage] = useState("");
  const [customStitch, setCustomStitch] = useState("");
  const [skeinsYardage, setSkeinsYardage] = useState("");

  const hasScale = stitchScale !== null && rowScale !== null;

  const yardageNum = parseFloat(origYardage);
  const newYardage = hasScale && !isNaN(yardageNum) && yardageNum > 0
    ? yardageNum * stitchScale! * rowScale! : null;
  const yardageDiff = newYardage !== null ? newYardage - yardageNum : null;

  const customNum = parseFloat(customStitch);
  const newCustom = stitchScale && !isNaN(customNum) && customNum > 0
    ? Math.round(customNum * stitchScale) : null;

  const skeinsNum = parseFloat(skeinsYardage);
  const skeinsNeeded = newYardage && !isNaN(skeinsNum) && skeinsNum > 0
    ? Math.ceil(newYardage / skeinsNum) : null;

  const overallScale = hasScale ? stitchScale! * rowScale! : null;

  return (
    <div className="space-y-6">
      {/* Scale summary */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Gauge Scale</h2>
        {!hasScale ? (
          <p className="text-sm text-gray-400">Fill in both gauges above to see your scale factors.</p>
        ) : (
          <div className="space-y-4">
            <ScaleBar scale={stitchScale!} label="Stitch scale" />
            <ScaleBar scale={rowScale!} label="Row / round scale" />
            {Math.abs(stitchScale! - 1) < 0.005 && Math.abs(rowScale! - 1) < 0.005 ? (
              <div className="mt-3 bg-emerald-50 text-emerald-700 text-sm font-medium px-4 py-3 rounded-xl">
                Your gauge matches the pattern perfectly — no adjustments needed.
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-3 gap-3">
                <StatBox
                  label="Stitch scale"
                  value={`${stitchScale!.toFixed(2)}×`}
                  sub={`${pct(stitchScale!).p}% ${pct(stitchScale!).dir} sts`}
                  color={scaleColor(stitchScale)}
                />
                <StatBox
                  label="Row scale"
                  value={`${rowScale!.toFixed(2)}×`}
                  sub={`${pct(rowScale!).p}% ${pct(rowScale!).dir} rows`}
                  color={scaleColor(rowScale)}
                />
                <StatBox
                  label="Yardage multiplier"
                  value={`${overallScale!.toFixed(2)}×`}
                  sub={overallScale! > 1 ? `${((overallScale! - 1) * 100).toFixed(1)}% more yarn` : `${((1 - overallScale!) * 100).toFixed(1)}% less yarn`}
                  color={scaleColor(overallScale)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Yardage calculator */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Yardage Calculator</h2>
        <p className="text-xs text-gray-400 mb-5">How much yarn do you actually need?</p>

        <div className="flex items-center gap-3 mb-5">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Pattern calls for</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                placeholder="e.g. 700"
                value={origYardage}
                onChange={(e) => setOrigYardage(e.target.value)}
                className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9b2335] transition-all"
              />
              <span className="text-xs text-gray-400">yards</span>
            </div>
          </div>
        </div>

        {newYardage !== null ? (
          <div className="bg-[#9b2335]/5 border border-[#9b2335]/20 rounded-xl p-5">
            <div className="text-xs text-[#9b2335] font-medium mb-1">You need</div>
            <div className="text-4xl font-bold text-gray-900">{Math.round(newYardage).toLocaleString()} yards</div>
            <div className="text-sm text-gray-500 mt-1">{toMeters(newYardage).toLocaleString()} meters</div>
            {yardageDiff !== null && Math.abs(yardageDiff) > 1 && (
              <div className={`mt-3 text-sm font-medium ${yardageDiff > 0 ? "text-blue-600" : "text-amber-600"}`}>
                {yardageDiff > 0 ? "+" : ""}{Math.round(yardageDiff)} yds {yardageDiff > 0 ? "more" : "less"} than the pattern
              </div>
            )}

            {/* Skein calculator */}
            <div className="mt-5 pt-5 border-t border-[#9b2335]/10">
              <div className="text-xs text-gray-500 mb-2">How many skeins? Enter your skein size:</div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 220"
                  value={skeinsYardage}
                  onChange={(e) => setSkeinsYardage(e.target.value)}
                  className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9b2335] transition-all bg-white"
                />
                <span className="text-xs text-gray-400">yds / skein</span>
                {skeinsNeeded !== null && (
                  <div className="ml-2 bg-white border border-[#9b2335]/30 rounded-lg px-4 py-2">
                    <span className="text-xl font-bold text-[#9b2335]">{skeinsNeeded}</span>
                    <span className="text-sm text-gray-500 ml-1">{skeinsNeeded === 1 ? "skein" : "skeins"}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-5 text-sm text-gray-400">
            {!hasScale
              ? "Fill in both gauges above to calculate yardage."
              : "Enter the yardage from your pattern to see how much you need."}
          </div>
        )}
      </div>

      {/* Stitch count converter */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Stitch Count Converter</h2>
        <p className="text-xs text-gray-400 mb-5">Convert any individual stitch count from the pattern.</p>

        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Pattern says</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                placeholder="e.g. 120"
                value={customStitch}
                onChange={(e) => setCustomStitch(e.target.value)}
                className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9b2335] transition-all"
              />
              <span className="text-xs text-gray-400">stitches</span>
            </div>
          </div>

          {newCustom !== null && (
            <>
              <div className="text-2xl text-gray-300 self-end pb-2">→</div>
              <div>
                <div className="text-xs text-gray-400 mb-1">You cast on</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">{newCustom}</span>
                  <span className="text-sm text-gray-400">stitches</span>
                </div>
                {newCustom !== Math.round(parseFloat(customStitch)) && (
                  <div className="text-xs text-gray-400 mt-1">was: {customStitch}</div>
                )}
              </div>
            </>
          )}
        </div>

        {!hasScale && (
          <p className="text-xs text-gray-400 mt-3">Fill in both gauges above to use this.</p>
        )}
      </div>
    </div>
  );
}

// ── RewriteTab ────────────────────────────────────────────────────────────────
function RewriteTab({
  stitchScale,
  rowScale,
  patternStitchesPerInch,
  patternRowsPerInch,
  yourStitchesPerInch,
  yourRowsPerInch,
}: {
  stitchScale: number | null;
  rowScale: number | null;
  patternStitchesPerInch: number | null;
  patternRowsPerInch: number | null;
  yourStitchesPerInch: number | null;
  yourRowsPerInch: number | null;
}) {
  const [patternText, setPatternText] = useState("");
  const [output, setOutput] = useState("");
  const [rewriting, setRewriting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const hasGauge = stitchScale !== null && rowScale !== null;
  const canRewrite = hasGauge && patternText.trim().length > 0 && !rewriting;

  async function handleRewrite() {
    if (!canRewrite) return;
    setRewriting(true);
    setOutput("");
    setError("");

    try {
      const res = await fetch("/api/gauge-convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patternText,
          patternStitchesPerInch,
          patternRowsPerInch,
          yourStitchesPerInch,
          yourRowsPerInch,
          stitchScale,
          rowScale,
        }),
      });

      if (!res.ok || !res.body) {
        setError("Something went wrong. Try again.");
        setRewriting(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setOutput((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setRewriting(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-5">
      {/* Pattern input */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Paste Your Pattern</h2>
        <p className="text-xs text-gray-400 mb-4">
          Paste any knitting or crochet pattern. Claude will rewrite every stitch count, row count, and cast-on to match your gauge — while keeping all measurements in inches the same.
        </p>
        <textarea
          value={patternText}
          onChange={(e) => setPatternText(e.target.value)}
          placeholder={`Paste your pattern here. For example:

Cast on 120 sts. Join to work in the round.
Rounds 1–4: *k2, p2; repeat from * to end.
Round 5: Knit.
Work until piece measures 10 inches from cast-on.
Next round: k2tog, knit to last 2 sts, ssk. (118 sts)
Repeat dec round every 6 rounds, 8 more times. (102 sts)
Cast off all sts.

Yarn: 480 yards worsted weight.`}
          rows={12}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#9b2335] resize-none transition-all"
        />

        {!hasGauge && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
            <span>⚠️</span>
            <span>Fill in both gauges above before rewriting.</span>
          </div>
        )}

        {hasGauge && (
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            <span>Stitch scale {stitchScale!.toFixed(3)}× · Row scale {rowScale!.toFixed(3)}× · Yardage ×{(stitchScale! * rowScale!).toFixed(2)}</span>
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleRewrite}
            disabled={!canRewrite}
            className="px-6 py-3 bg-[#9b2335] text-white text-sm font-semibold rounded-xl hover:bg-[#7d1c2a] transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {rewriting ? "Rewriting…" : "Rewrite Pattern"}
          </button>
          {patternText && (
            <button
              onClick={() => setPatternText("")}
              className="px-4 py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Output */}
      {(output || rewriting) && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">Rewritten Pattern</h2>
              {rewriting && (
                <span className="inline-flex items-center gap-1.5 text-xs text-[#9b2335]">
                  <span className="w-1.5 h-1.5 bg-[#9b2335] rounded-full animate-pulse" />
                  Writing…
                </span>
              )}
            </div>
            {output && !rewriting && (
              <button
                onClick={handleCopy}
                className="text-xs font-medium text-gray-500 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 transition-all hover:border-gray-400"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            )}
          </div>
          <div className="p-6">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
              {output}
              {rewriting && <span className="inline-block w-0.5 h-4 bg-[#9b2335] animate-pulse ml-0.5 align-middle" />}
            </pre>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function GaugeCalculator({ username }: { username: string }) {
  const [tab, setTab] = useState<"quick" | "rewrite">("quick");
  const [patternGauge, setPatternGauge] = useState<Gauge>({ stitches: "", rows: "", unit: "4inch" });
  const [yourGauge, setYourGauge] = useState<Gauge>({ stitches: "", rows: "", unit: "4inch" });

  const pSts = parseFloat(patternGauge.stitches);
  const pRows = parseFloat(patternGauge.rows);
  const ySts = parseFloat(yourGauge.stitches);
  const yRows = parseFloat(yourGauge.rows);

  const pStsPerInch = !isNaN(pSts) && pSts > 0 ? perInch(pSts, patternGauge.unit) : null;
  const pRowsPerInch = !isNaN(pRows) && pRows > 0 ? perInch(pRows, patternGauge.unit) : null;
  const yStsPerInch = !isNaN(ySts) && ySts > 0 ? perInch(ySts, yourGauge.unit) : null;
  const yRowsPerInch = !isNaN(yRows) && yRows > 0 ? perInch(yRows, yourGauge.unit) : null;

  const stitchScale = pStsPerInch && yStsPerInch ? yStsPerInch / pStsPerInch : null;
  const rowScale = pRowsPerInch && yRowsPerInch ? yRowsPerInch / pRowsPerInch : null;

  const handlePatternGauge = useCallback((g: Gauge) => setPatternGauge(g), []);
  const handleYourGauge = useCallback((g: Gauge) => setYourGauge(g), []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-bold text-gray-900 hover:text-[#9b2335] transition-colors">
              CraftersKit
            </Link>
            <span className="text-gray-200">|</span>
            <span className="text-sm font-medium text-gray-500">Gauge Calculator</span>
          </div>
          {username && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">@{username}</span>
              <a href="/api/auth/signout" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                Sign out
              </a>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/" className="text-sm text-gray-400 hover:text-[#9b2335] transition-colors inline-flex items-center gap-1 mb-6">
          ← Back to search
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gauge Calculator</h1>
          <p className="text-gray-500 text-sm">
            Using different yarn or needles? Convert any pattern to your gauge — new stitch counts, row counts, and yardage, instantly.
          </p>
        </div>

        {/* Tab selector */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8 w-fit">
          {([["quick", "Quick Calculator"], ["rewrite", "Rewrite My Pattern"]] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Gauge inputs — shared */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <GaugeCard
            title="Pattern Gauge"
            subtitle="From the pattern — what the pattern was written for"
            value={patternGauge}
            onChange={handlePatternGauge}
          />
          <GaugeCard
            title="Your Gauge"
            subtitle="From your swatch — what you actually knit"
            value={yourGauge}
            onChange={handleYourGauge}
            accent
          />
        </div>

        {tab === "quick" && (
          <QuickTab stitchScale={stitchScale} rowScale={rowScale} />
        )}

        {tab === "rewrite" && (
          <RewriteTab
            stitchScale={stitchScale}
            rowScale={rowScale}
            patternStitchesPerInch={pStsPerInch}
            patternRowsPerInch={pRowsPerInch}
            yourStitchesPerInch={yStsPerInch}
            yourRowsPerInch={yRowsPerInch}
          />
        )}
      </div>
    </div>
  );
}
