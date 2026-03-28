"use client";
import { useState } from "react";
import Link from "next/link";

// ── helpers ───────────────────────────────────────────────────────────────────
function perInch(v: number, unit: "inch" | "4inch") {
  return unit === "4inch" ? v / 4 : v;
}
function toMeters(yards: number) {
  return Math.round(yards * 0.9144);
}

// ── Info Tooltip ──────────────────────────────────────────────────────────────
function InfoTip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center ml-2 align-middle">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="w-6 h-6 rounded-full border-2 border-dashed border-[#9b2335]/50 text-[#9b2335] text-sm font-bold flex items-center justify-center cursor-help hover:bg-[#9b2335] hover:text-white hover:border-solid transition-all duration-200"
        aria-label="More information"
      >
        i
      </button>
      {show && (
        <div className="absolute left-8 top-1/2 -translate-y-1/2 z-50 bg-gray-900 text-white text-base rounded-2xl px-4 py-3 w-72 shadow-2xl leading-relaxed pointer-events-none">
          {text}
        </div>
      )}
    </span>
  );
}

// ── Gauge Input Block ─────────────────────────────────────────────────────────
function GaugeInputs({
  stitches, onSts, rows, onRows, unit, onUnit, accent,
}: {
  stitches: string; onSts: (v: string) => void;
  rows: string; onRows: (v: string) => void;
  unit: "inch" | "4inch"; onUnit: (u: "inch" | "4inch") => void;
  accent?: boolean;
}) {
  const focusRing = accent ? "focus:border-[#9b2335] focus:ring-[#9b2335]/20" : "focus:border-gray-500 focus:ring-gray-200";
  const hoverBorder = accent ? "hover:border-[#9b2335]/60" : "hover:border-gray-400";
  return (
    <div className="space-y-5">
      {/* Unit toggle */}
      <div className="flex gap-2">
        {(["4inch", "inch"] as const).map((u) => (
          <button
            key={u}
            onClick={() => onUnit(u)}
            className={`px-4 py-2 rounded-xl text-base font-semibold border-2 border-dashed transition-all duration-200 ${
              unit === u
                ? "border-solid border-[#9b2335] bg-[#9b2335] text-white"
                : "border-gray-300 text-gray-500 hover:border-[#9b2335]/50 hover:text-[#9b2335]"
            }`}
          >
            {u === "4inch" ? "per 4 in / 10 cm" : "per inch"}
          </button>
        ))}
      </div>

      {/* Two inputs side by side */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Stitches", val: stitches, set: onSts, ph: "e.g. 20",
            tip: "How many stitches fit across 4 inches. Find this on your pattern label — for example '20 sts = 4 inches' means enter 20." },
          { label: "Rows", val: rows, set: onRows, ph: "e.g. 28",
            tip: "How many rows fit in 4 inches, measured top to bottom. Often the second number in your gauge — e.g. '28 rows = 4 inches'." },
        ].map(({ label, val, set, ph, tip }) => (
          <div key={label} className="group">
            <div className="flex items-center mb-2">
              <label className="text-xl font-bold text-gray-700">{label}</label>
              <InfoTip text={tip} />
            </div>
            <input
              type="number" min="0" step="0.5" placeholder={ph} value={val}
              onChange={(e) => set(e.target.value)}
              className={`w-full text-3xl font-bold border-2 border-dashed ${accent ? "border-[#9b2335]/30" : "border-gray-300"} ${hoverBorder} rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:border-solid ${focusRing} transition-all duration-200 bg-white placeholder:text-gray-200 placeholder:font-normal`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Live Result Card ──────────────────────────────────────────────────────────
function LiveCard({
  label, value, sub, color, empty,
}: {
  label: string; value: string; sub?: string; color: string; empty?: boolean;
}) {
  return (
    <div className={`border-2 border-dashed rounded-2xl p-5 transition-all duration-200 hover:border-solid hover:shadow-md hover:scale-[1.02] cursor-default ${color}`}>
      <div className="text-sm font-semibold uppercase tracking-widest mb-2 opacity-60">{label}</div>
      <div className={`text-4xl font-bold ${empty ? "opacity-25" : ""}`}>{value}</div>
      {sub && <div className="text-sm mt-1 opacity-70">{sub}</div>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GaugeCalculator({ username }: { username: string }) {
  const [tab, setTab] = useState<"quick" | "rewrite">("quick");

  const [patSts, setPatSts] = useState("");
  const [patRows, setPatRows] = useState("");
  const [patUnit, setPatUnit] = useState<"inch" | "4inch">("4inch");
  const [yourSts, setYourSts] = useState("");
  const [yourRows, setYourRows] = useState("");
  const [yourUnit, setYourUnit] = useState<"inch" | "4inch">("4inch");

  const [origYardage, setOrigYardage] = useState("");
  const [skeinsYardage, setSkeinsYardage] = useState("");
  const [customStitch, setCustomStitch] = useState("");

  const [patternText, setPatternText] = useState("");
  const [output, setOutput] = useState("");
  const [rewriting, setRewriting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rewriteError, setRewriteError] = useState("");

  // computed
  const pStsPerIn = patSts && +patSts > 0 ? perInch(+patSts, patUnit) : null;
  const pRowsPerIn = patRows && +patRows > 0 ? perInch(+patRows, patUnit) : null;
  const yStsPerIn = yourSts && +yourSts > 0 ? perInch(+yourSts, yourUnit) : null;
  const yRowsPerIn = yourRows && +yourRows > 0 ? perInch(+yourRows, yourUnit) : null;

  const stitchScale = pStsPerIn && yStsPerIn ? yStsPerIn / pStsPerIn : null;
  const rowScale = pRowsPerIn && yRowsPerIn ? yRowsPerIn / pRowsPerIn : null;
  const hasScale = stitchScale !== null && rowScale !== null;
  const perfect = hasScale && Math.abs(stitchScale! - 1) < 0.02 && Math.abs(rowScale! - 1) < 0.02;

  const yardNum = parseFloat(origYardage);
  const newYards = hasScale && !isNaN(yardNum) && yardNum > 0 ? yardNum * stitchScale! * rowScale! : null;
  const yardDiff = newYards !== null ? Math.round(newYards - yardNum) : null;

  const skeinsNum = parseFloat(skeinsYardage);
  const skeinsNeeded = newYards && !isNaN(skeinsNum) && skeinsNum > 0 ? Math.ceil(newYards / skeinsNum) : null;

  const custNum = parseFloat(customStitch);
  const newCust = stitchScale && !isNaN(custNum) && custNum > 0 ? Math.round(custNum * stitchScale) : null;

  function scaleLabel(s: number) {
    const p = Math.abs((s - 1) * 100).toFixed(0);
    return s > 1 ? `+${p}% more` : s < 1 ? `−${p}% fewer` : "perfect match";
  }
  function scaleCardColor(s: number | null) {
    if (!s) return "border-gray-200 text-gray-400 bg-white";
    if (Math.abs(s - 1) < 0.02) return "border-emerald-300 text-emerald-800 bg-emerald-50";
    return s > 1 ? "border-blue-300 text-blue-800 bg-blue-50" : "border-amber-300 text-amber-800 bg-amber-50";
  }

  async function handleRewrite() {
    if (!hasScale || !patternText.trim()) return;
    setRewriting(true); setOutput(""); setRewriteError("");
    try {
      const res = await fetch("/api/gauge-convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patternText, patternStitchesPerInch: pStsPerIn, patternRowsPerInch: pRowsPerIn, yourStitchesPerInch: yStsPerIn, yourRowsPerInch: yRowsPerIn, stitchScale, rowScale }),
      });
      if (!res.ok || !res.body) { setRewriteError("Something went wrong. Try again."); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setOutput((p) => p + decoder.decode(value, { stream: true }));
      }
    } catch { setRewriteError("Something went wrong. Try again."); }
    finally { setRewriting(false); }
  }

  return (
    <div className="min-h-screen" style={{ background: "#f7f3ee" }}>
      {/* Header */}
      <header className="bg-white border-b-2 border-dashed border-[#9b2335]/30 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-bold text-gray-900 hover:text-[#9b2335] transition-colors">CraftersKit</Link>
          <span className="text-2xl text-[#9b2335]/30">- - -</span>
          <span className="text-lg font-bold text-[#9b2335]">Gauge Calculator</span>
        </div>
        {username && (
          <div className="flex items-center gap-4">
            <span className="text-base text-gray-400">@{username}</span>
            <a href="/api/auth/signout" className="text-base text-gray-400 hover:text-[#9b2335] transition-colors">Sign out</a>
          </div>
        )}
      </header>

      {/* Full-width content */}
      <div className="w-full px-8 py-8">

        {/* Top bar: title + tabs */}
        <div className="flex items-end justify-between mb-8 pb-6 border-b-2 border-dashed border-[#9b2335]/20">
          <div>
            <Link href="/" className="text-base text-gray-400 hover:text-[#9b2335] transition-colors inline-flex items-center gap-1 mb-3 block">← Back to search</Link>
            <h1 className="text-5xl font-bold text-gray-900">Gauge Calculator</h1>
            <p className="text-xl text-gray-500 mt-2">Different yarn? Different needles? We&apos;ll do the math.</p>
          </div>
          <div className="flex gap-2">
            {([["quick", "Quick Calculator"], ["rewrite", "Rewrite My Pattern"]] as const).map(([v, label]) => (
              <button key={v} onClick={() => setTab(v)}
                className={`px-6 py-3 rounded-2xl text-lg font-bold border-2 transition-all duration-200 hover:scale-105 ${
                  tab === v ? "border-solid border-[#9b2335] bg-[#9b2335] text-white shadow-lg" : "border-dashed border-gray-300 text-gray-500 hover:border-[#9b2335]/50 hover:text-[#9b2335] bg-white"
                }`}
              >{label}</button>
            ))}
          </div>
        </div>

        {tab === "quick" && (
          <div className="grid grid-cols-2 gap-8">

            {/* LEFT: Inputs */}
            <div className="space-y-6">

              {/* Step 1 */}
              <div className="bg-white border-2 border-dashed border-gray-300 rounded-3xl p-7 hover:border-gray-400 hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-3 mb-5 pb-4 border-b-2 border-dashed border-gray-200">
                  <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center text-xl font-bold text-gray-500">1</div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">What does your pattern say?</h2>
                    <p className="text-base text-gray-400">From the pattern label or first page</p>
                  </div>
                  <InfoTip text="Gauge is listed on every pattern — usually near the top. It says something like '20 stitches = 4 inches in stockinette stitch'." />
                </div>
                <GaugeInputs stitches={patSts} onSts={setPatSts} rows={patRows} onRows={setPatRows} unit={patUnit} onUnit={setPatUnit} />
              </div>

              {/* Dashed stitch divider */}
              <div className="flex items-center gap-3 px-4">
                <div className="flex-1 border-t-2 border-dashed border-[#9b2335]/30" />
                <span className="text-[#9b2335]/50 text-xl">🧵</span>
                <div className="flex-1 border-t-2 border-dashed border-[#9b2335]/30" />
              </div>

              {/* Step 2 */}
              <div className="bg-white border-2 border-dashed border-[#9b2335]/40 rounded-3xl p-7 hover:border-[#9b2335] hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-3 mb-5 pb-4 border-b-2 border-dashed border-[#9b2335]/20">
                  <div className="w-10 h-10 rounded-full border-2 border-dashed border-[#9b2335] flex items-center justify-center text-xl font-bold text-[#9b2335]">2</div>
                  <div>
                    <h2 className="text-2xl font-bold text-[#9b2335]">What does YOUR knitting measure?</h2>
                    <p className="text-base text-gray-400">From your swatch with your own yarn and needles</p>
                  </div>
                  <InfoTip text="Knit a small test square (called a swatch), then count how many stitches and rows fit in 4 inches. This is YOUR gauge — and it's what we use to recalculate the pattern." />
                </div>
                <GaugeInputs stitches={yourSts} onSts={setYourSts} rows={yourRows} onRows={setYourRows} unit={yourUnit} onUnit={setYourUnit} accent />
              </div>
            </div>

            {/* RIGHT: Live results */}
            <div className="space-y-5">

              {/* Perfect match banner */}
              {perfect && (
                <div className="border-2 border-solid border-emerald-400 bg-emerald-50 rounded-3xl p-6 text-center hover:shadow-lg transition-all duration-200">
                  <div className="text-4xl mb-2">🎉</div>
                  <h3 className="text-2xl font-bold text-emerald-800">Perfect match!</h3>
                  <p className="text-lg text-emerald-700 mt-1">Use the pattern exactly as written.</p>
                </div>
              )}

              {/* Scale cards */}
              {!perfect && (
                <div className="grid grid-cols-2 gap-4">
                  <LiveCard
                    label="Stitch scale"
                    value={stitchScale ? `${stitchScale.toFixed(2)}×` : "—"}
                    sub={stitchScale ? scaleLabel(stitchScale) + " sts per row" : "Enter stitches in both steps"}
                    color={scaleCardColor(stitchScale)}
                    empty={!stitchScale}
                  />
                  <LiveCard
                    label="Row scale"
                    value={rowScale ? `${rowScale.toFixed(2)}×` : "—"}
                    sub={rowScale ? scaleLabel(rowScale) + " rows" : "Enter rows in both steps"}
                    color={scaleCardColor(rowScale)}
                    empty={!rowScale}
                  />
                </div>
              )}

              {/* Overall yarn */}
              {hasScale && !perfect && (
                <div className={`border-2 border-dashed rounded-3xl p-5 text-center hover:border-solid hover:shadow-md hover:scale-[1.01] transition-all duration-200 ${scaleCardColor(stitchScale! * rowScale!)}`}>
                  <div className="text-sm font-semibold uppercase tracking-widest mb-1 opacity-60">Overall — you need</div>
                  <div className="text-4xl font-bold">
                    {((stitchScale! * rowScale! - 1) * 100) > 0
                      ? `+${((stitchScale! * rowScale! - 1) * 100).toFixed(0)}%`
                      : `−${((1 - stitchScale! * rowScale!) * 100).toFixed(0)}%`}
                    {" "}more yarn
                  </div>
                </div>
              )}

              {/* Dashed divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t-2 border-dashed border-gray-300" />
                <span className="text-gray-300 text-lg">🧶</span>
                <div className="flex-1 border-t-2 border-dashed border-gray-300" />
              </div>

              {/* Yardage */}
              <div className="bg-white border-2 border-dashed border-gray-300 rounded-3xl p-6 hover:border-[#9b2335]/50 hover:shadow-md transition-all duration-200">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  How much yarn do you need?
                  <InfoTip text="Find the total yards your pattern needs — usually listed near the top of the pattern or on the materials list." />
                </h3>
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="number" min="0" placeholder="e.g. 700" value={origYardage}
                    onChange={(e) => setOrigYardage(e.target.value)}
                    className="w-36 text-2xl font-bold border-2 border-dashed border-gray-300 hover:border-[#9b2335]/50 focus:border-[#9b2335] focus:border-solid focus:ring-4 focus:ring-[#9b2335]/20 rounded-2xl px-4 py-3 focus:outline-none transition-all duration-200 bg-white placeholder:text-gray-200 placeholder:font-normal"
                  />
                  <span className="text-xl text-gray-500 font-semibold">yards from pattern</span>
                </div>

                {newYards ? (
                  <div className="bg-[#9b2335]/5 border-2 border-dashed border-[#9b2335]/30 rounded-2xl p-4 hover:border-solid hover:border-[#9b2335]/50 transition-all duration-200">
                    <div className="text-sm text-[#9b2335] font-bold uppercase tracking-wider mb-1">You need</div>
                    <div className="text-5xl font-bold text-[#9b2335]">{Math.round(newYards).toLocaleString()} <span className="text-2xl font-semibold text-gray-500">yards</span></div>
                    <div className="text-base text-gray-500 mt-1">
                      {toMeters(newYards).toLocaleString()} meters
                      {yardDiff !== null && Math.abs(yardDiff) > 2 && ` — ${yardDiff > 0 ? "+" : ""}${yardDiff} yds vs. pattern`}
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center text-gray-400 text-lg">
                    {!hasScale ? "Enter your gauge first" : "Enter yards above"}
                  </div>
                )}

                {/* Skein calc */}
                {newYards && (
                  <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-200">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min="0" placeholder="e.g. 220" value={skeinsYardage}
                          onChange={(e) => setSkeinsYardage(e.target.value)}
                          className="w-28 text-xl font-bold border-2 border-dashed border-gray-300 hover:border-[#9b2335]/50 focus:border-[#9b2335] focus:border-solid focus:ring-4 focus:ring-[#9b2335]/20 rounded-xl px-3 py-2 focus:outline-none transition-all duration-200 bg-white placeholder:text-gray-200 placeholder:font-normal"
                        />
                        <span className="text-base text-gray-500">yds/skein</span>
                      </div>
                      {skeinsNeeded && (
                        <div className="flex items-center gap-2 bg-white border-2 border-dashed border-[#9b2335]/40 rounded-xl px-4 py-2 hover:border-solid hover:border-[#9b2335] transition-all duration-200">
                          <span className="text-3xl font-bold text-[#9b2335]">{skeinsNeeded}</span>
                          <span className="text-lg text-gray-500">{skeinsNeeded === 1 ? "skein" : "skeins"}</span>
                        </div>
                      )}
                      {!skeinsYardage && <span className="text-base text-gray-400">← Enter skein size to get skein count</span>}
                    </div>
                  </div>
                )}
              </div>

              {/* Stitch count converter */}
              <div className="bg-white border-2 border-dashed border-gray-300 rounded-3xl p-6 hover:border-[#9b2335]/50 hover:shadow-md transition-all duration-200">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  Convert a stitch count
                  <InfoTip text="Pattern says 'Cast on 120 stitches'? Type 120 here and see how many to cast on with your gauge." />
                </h3>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min="0" placeholder="e.g. 120" value={customStitch}
                      onChange={(e) => setCustomStitch(e.target.value)}
                      className="w-32 text-2xl font-bold border-2 border-dashed border-gray-300 hover:border-[#9b2335]/50 focus:border-[#9b2335] focus:border-solid focus:ring-4 focus:ring-[#9b2335]/20 rounded-2xl px-4 py-3 focus:outline-none transition-all duration-200 bg-white placeholder:text-gray-200 placeholder:font-normal"
                    />
                    <span className="text-base text-gray-500">sts (pattern)</span>
                  </div>
                  {newCust !== null ? (
                    <>
                      <span className="text-3xl text-gray-300">→</span>
                      <div>
                        <div className="text-4xl font-bold text-[#9b2335]">{newCust} <span className="text-xl font-normal text-gray-500">sts (you)</span></div>
                        {newCust !== Math.round(custNum) && <div className="text-sm text-gray-400 mt-0.5">was {customStitch} in the pattern</div>}
                      </div>
                    </>
                  ) : (
                    <span className="text-base text-gray-400">{!hasScale ? "Enter gauge first" : "Enter a stitch count"}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REWRITE TAB ─────────────────────────────────────────────────────── */}
        {tab === "rewrite" && (
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-5">
              {/* Gauge inputs condensed */}
              <div className="bg-white border-2 border-dashed border-gray-300 rounded-3xl p-6 hover:border-gray-400 transition-all duration-200">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Step 1 — Pattern gauge</h2>
                <GaugeInputs stitches={patSts} onSts={setPatSts} rows={patRows} onRows={setPatRows} unit={patUnit} onUnit={setPatUnit} />
              </div>
              <div className="flex items-center gap-3 px-4">
                <div className="flex-1 border-t-2 border-dashed border-[#9b2335]/30" />
                <span className="text-[#9b2335]/40 text-xl">🧵</span>
                <div className="flex-1 border-t-2 border-dashed border-[#9b2335]/30" />
              </div>
              <div className="bg-white border-2 border-dashed border-[#9b2335]/40 rounded-3xl p-6 hover:border-[#9b2335] transition-all duration-200">
                <h2 className="text-xl font-bold text-[#9b2335] mb-4">Step 2 — Your gauge</h2>
                <GaugeInputs stitches={yourSts} onSts={setYourSts} rows={yourRows} onRows={setYourRows} unit={yourUnit} onUnit={setYourUnit} accent />
              </div>

              {/* Paste pattern */}
              <div className="bg-white border-2 border-dashed border-gray-300 rounded-3xl p-6 hover:border-gray-400 transition-all duration-200">
                <h2 className="text-xl font-bold text-gray-800 mb-1 flex items-center gap-2">
                  Paste your pattern
                  <InfoTip text="Copy the written instructions from your pattern — the part with cast-on, rows, stitch counts. We'll rewrite every number for your gauge." />
                </h2>
                <p className="text-base text-gray-400 mb-4">Inch measurements won&apos;t change — only stitch and row counts.</p>
                <textarea
                  value={patternText} onChange={(e) => setPatternText(e.target.value)} rows={10}
                  placeholder={"Cast on 120 sts. Join to work in the round.\nRounds 1–4: *k2, p2; repeat from * to end.\nWork until piece measures 10 inches from cast-on.\nNext round: k2tog, knit to last 2 sts, ssk. (118 sts)\nRepeat dec round every 6 rounds, 8 more times. (102 sts)\nCast off all sts.\nYarn: 480 yards worsted weight."}
                  className="w-full border-2 border-dashed border-gray-200 hover:border-gray-300 focus:border-[#9b2335] focus:border-solid focus:ring-4 focus:ring-[#9b2335]/20 rounded-2xl px-4 py-3 text-lg font-mono focus:outline-none resize-y transition-all duration-200 leading-relaxed"
                />
                {hasScale && (
                  <div className="mt-3 border-2 border-dashed border-gray-200 rounded-xl px-4 py-2 text-base text-gray-500">
                    Stitch ×{stitchScale!.toFixed(2)} · Rows ×{rowScale!.toFixed(2)} · Yarn ×{(stitchScale! * rowScale!).toFixed(2)}
                  </div>
                )}
                <div className="mt-4 flex gap-3">
                  <button onClick={handleRewrite} disabled={!hasScale || !patternText.trim() || rewriting}
                    className="px-8 py-4 bg-[#9b2335] text-white text-xl font-bold rounded-2xl hover:bg-[#7d1c2a] hover:scale-105 transition-all duration-200 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:scale-100 shadow-md">
                    {rewriting ? "Rewriting…" : "Rewrite My Pattern"}
                  </button>
                  {patternText && !rewriting && (
                    <button onClick={() => { setPatternText(""); setOutput(""); }}
                      className="px-5 py-4 text-lg text-gray-400 hover:text-[#9b2335] transition-colors">Clear</button>
                  )}
                </div>
                {rewriteError && <p className="mt-3 text-lg text-red-500">{rewriteError}</p>}
                {!hasScale && <p className="mt-3 text-base text-amber-600 bg-amber-50 border-2 border-dashed border-amber-200 rounded-xl px-4 py-2">Fill in both gauge steps first.</p>}
              </div>
            </div>

            {/* Rewrite output */}
            <div>
              {(output || rewriting) ? (
                <div className="bg-white border-2 border-dashed border-gray-300 rounded-3xl overflow-hidden hover:border-gray-400 transition-all duration-200 sticky top-4">
                  <div className="flex items-center justify-between px-6 py-4 border-b-2 border-dashed border-gray-200">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-gray-900">Your Rewritten Pattern</h2>
                      {rewriting && <span className="flex items-center gap-1.5 text-base text-[#9b2335] font-semibold"><span className="w-2 h-2 bg-[#9b2335] rounded-full animate-pulse" />Writing…</span>}
                    </div>
                    {output && !rewriting && (
                      <button onClick={async () => { await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                        className="text-lg font-semibold text-gray-600 hover:text-[#9b2335] border-2 border-dashed border-gray-300 hover:border-[#9b2335] rounded-xl px-4 py-2 transition-all duration-200 hover:scale-105">
                        {copied ? "Copied! ✓" : "Copy"}
                      </button>
                    )}
                  </div>
                  <div className="p-6 max-h-[70vh] overflow-y-auto">
                    <pre className="text-lg text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                      {output}
                      {rewriting && <span className="inline-block w-0.5 h-5 bg-[#9b2335] animate-pulse ml-1 align-middle" />}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 flex flex-col items-center justify-center text-center h-64 hover:border-gray-300 transition-all duration-200">
                  <div className="text-5xl mb-4">🧶</div>
                  <p className="text-xl text-gray-400">Your rewritten pattern will appear here</p>
                  <p className="text-base text-gray-300 mt-1">Enter your gauges and paste your pattern, then click Rewrite</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
