"use client";
import { useState, useCallback } from "react";
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
    <span className="relative inline-flex items-center ml-2">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="w-6 h-6 rounded-full bg-[#9b2335]/10 text-[#9b2335] text-sm font-bold flex items-center justify-center cursor-help hover:bg-[#9b2335]/20 transition-colors flex-shrink-0"
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

// ── Big Number Input ──────────────────────────────────────────────────────────
function BigInput({
  value,
  onChange,
  placeholder,
  label,
  tip,
  accent,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  tip: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center mb-3">
        <label className="text-xl font-semibold text-gray-800">{label}</label>
        <InfoTip text={tip} />
      </div>
      <input
        type="number"
        min="0"
        step="0.5"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full text-2xl font-bold border-2 ${
          accent
            ? "border-[#9b2335]/40 focus:border-[#9b2335] focus:ring-[#9b2335]/20"
            : "border-gray-200 focus:border-gray-400 focus:ring-gray-200"
        } rounded-2xl px-6 py-5 focus:outline-none focus:ring-4 transition-all bg-white placeholder:text-gray-300 placeholder:font-normal`}
      />
    </div>
  );
}

// ── Unit Toggle ───────────────────────────────────────────────────────────────
function UnitToggle({
  value,
  onChange,
}: {
  value: "inch" | "4inch";
  onChange: (u: "inch" | "4inch") => void;
}) {
  return (
    <div className="flex items-center gap-2 mb-6">
      <span className="text-lg text-gray-600">Measuring</span>
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {([["4inch", "per 4 in / 10 cm"], ["inch", "per inch"]] as const).map(([u, label]) => (
          <button
            key={u}
            onClick={() => onChange(u)}
            className={`px-4 py-2 rounded-lg text-base font-semibold transition-all ${
              value === u ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <InfoTip text="Most knitting patterns use 'per 4 inches' (also written as per 10 cm). You'll see it on your pattern label — it usually says something like '20 sts = 4 inches'." />
    </div>
  );
}

// ── Result Box ────────────────────────────────────────────────────────────────
function ResultBox({
  label,
  number,
  unit,
  sub,
  color,
}: {
  label: string;
  number: string;
  unit?: string;
  sub?: string;
  color: "green" | "blue" | "amber" | "red";
}) {
  const colors = {
    green: "bg-emerald-50 border-emerald-200 text-emerald-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    red: "bg-[#9b2335]/5 border-[#9b2335]/20 text-[#9b2335]",
  };
  const numColors = {
    green: "text-emerald-800",
    blue: "text-blue-800",
    amber: "text-amber-800",
    red: "text-[#9b2335]",
  };
  return (
    <div className={`rounded-3xl border-2 p-6 ${colors[color]}`}>
      <div className="text-lg font-semibold mb-2 opacity-80">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className={`text-5xl font-bold ${numColors[color]}`}>{number}</span>
        {unit && <span className="text-2xl font-semibold opacity-70">{unit}</span>}
      </div>
      {sub && <div className="text-base mt-2 opacity-70">{sub}</div>}
    </div>
  );
}

// ── Main GaugeCalculator ──────────────────────────────────────────────────────
export default function GaugeCalculator({ username }: { username: string }) {
  const [tab, setTab] = useState<"quick" | "rewrite">("quick");

  // gauge state
  const [patSts, setPatSts] = useState("");
  const [patRows, setPatRows] = useState("");
  const [patUnit, setPatUnit] = useState<"inch" | "4inch">("4inch");
  const [yourSts, setYourSts] = useState("");
  const [yourRows, setYourRows] = useState("");
  const [yourUnit, setYourUnit] = useState<"inch" | "4inch">("4inch");

  // quick calc extras
  const [origYardage, setOrigYardage] = useState("");
  const [customStitch, setCustomStitch] = useState("");
  const [skeinsYardage, setSkeinsYardage] = useState("");

  // rewrite tab
  const [patternText, setPatternText] = useState("");
  const [output, setOutput] = useState("");
  const [rewriting, setRewriting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rewriteError, setRewriteError] = useState("");

  // computed
  const pStsPerIn = patSts && parseFloat(patSts) > 0 ? perInch(parseFloat(patSts), patUnit) : null;
  const pRowsPerIn = patRows && parseFloat(patRows) > 0 ? perInch(parseFloat(patRows), patUnit) : null;
  const yStsPerIn = yourSts && parseFloat(yourSts) > 0 ? perInch(parseFloat(yourSts), yourUnit) : null;
  const yRowsPerIn = yourRows && parseFloat(yourRows) > 0 ? perInch(parseFloat(yourRows), yourUnit) : null;

  const stitchScale = pStsPerIn && yStsPerIn ? yStsPerIn / pStsPerIn : null;
  const rowScale = pRowsPerIn && yRowsPerIn ? yRowsPerIn / pRowsPerIn : null;
  const hasScale = stitchScale !== null && rowScale !== null;

  const yardageNum = parseFloat(origYardage);
  const newYardage = hasScale && !isNaN(yardageNum) && yardageNum > 0
    ? yardageNum * stitchScale! * rowScale! : null;
  const yardageDiff = newYardage !== null ? Math.round(newYardage - yardageNum) : null;

  const customNum = parseFloat(customStitch);
  const newCustom = stitchScale && !isNaN(customNum) && customNum > 0
    ? Math.round(customNum * stitchScale) : null;

  const skeinsNum = parseFloat(skeinsYardage);
  const skeinsNeeded = newYardage && !isNaN(skeinsNum) && skeinsNum > 0
    ? Math.ceil(newYardage / skeinsNum) : null;

  const perfectMatch = hasScale && Math.abs(stitchScale! - 1) < 0.02 && Math.abs(rowScale! - 1) < 0.02;

  async function handleRewrite() {
    if (!hasScale || !patternText.trim()) return;
    setRewriting(true);
    setOutput("");
    setRewriteError("");
    try {
      const res = await fetch("/api/gauge-convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patternText,
          patternStitchesPerInch: pStsPerIn,
          patternRowsPerInch: pRowsPerIn,
          yourStitchesPerInch: yStsPerIn,
          yourRowsPerInch: yRowsPerIn,
          stitchScale,
          rowScale,
        }),
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
    <div className="min-h-screen" style={{ background: "#faf9f7" }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-bold text-gray-900 hover:text-[#9b2335] transition-colors">
            CraftersKit
          </Link>
          <span className="text-gray-300 text-xl">|</span>
          <span className="text-lg font-semibold text-[#9b2335]">Gauge Calculator</span>
        </div>
        {username && (
          <div className="flex items-center gap-4">
            <span className="text-base text-gray-400">@{username}</span>
            <a href="/api/auth/signout" className="text-base text-gray-400 hover:text-gray-700 transition-colors">Sign out</a>
          </div>
        )}
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/" className="text-base text-gray-400 hover:text-[#9b2335] transition-colors inline-flex items-center gap-1 mb-8">
          ← Back to search
        </Link>

        {/* Page title */}
        <div className="mb-10">
          <h1 className="text-5xl font-bold text-gray-900 mb-3">Gauge Calculator</h1>
          <p className="text-xl text-gray-500 leading-relaxed">
            Using different yarn or needles than the pattern calls for?<br />
            Just fill in the numbers and we&apos;ll do all the math for you.
          </p>
        </div>

        {/* Tab selector */}
        <div className="flex gap-2 mb-10">
          {([["quick", "Quick Calculator"], ["rewrite", "Rewrite My Pattern"]] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className={`px-6 py-3 rounded-2xl text-lg font-semibold transition-all ${
                tab === v
                  ? "bg-[#9b2335] text-white shadow-md"
                  : "bg-white text-gray-500 border-2 border-gray-200 hover:border-[#9b2335]/30 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── STEP 1 ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-5">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-500 flex-shrink-0">1</div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">What does your pattern say?</h2>
              <p className="text-base text-gray-400 mt-0.5">Find the gauge on your pattern label or first page</p>
            </div>
            <InfoTip text="Gauge is listed on every pattern — usually something like '20 stitches = 4 inches in stockinette stitch'. Find it near the top of your pattern, often under 'Materials' or 'Gauge'." />
          </div>

          <UnitToggle value={patUnit} onChange={setPatUnit} />

          <div className="grid grid-cols-2 gap-5">
            <BigInput
              value={patSts}
              onChange={setPatSts}
              placeholder="e.g. 20"
              label="Stitches"
              tip="How many stitches fit across 4 inches (or 1 inch) according to the pattern. This is the first number in your gauge — for example, in '20 sts = 4 in', enter 20."
            />
            <BigInput
              value={patRows}
              onChange={setPatRows}
              placeholder="e.g. 28"
              label="Rows"
              tip="How many rows fit in 4 inches (or 1 inch) according to the pattern. This is the second number — for example, in '20 sts and 28 rows = 4 in', enter 28."
            />
          </div>
        </div>

        {/* ── STEP 2 ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-sm border-2 border-[#9b2335]/20 p-8 mb-5">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#9b2335]/10 flex items-center justify-center text-xl font-bold text-[#9b2335] flex-shrink-0">2</div>
            <div>
              <h2 className="text-2xl font-bold text-[#9b2335]">What does YOUR knitting measure?</h2>
              <p className="text-base text-gray-400 mt-0.5">From your test swatch with your yarn and needles</p>
            </div>
            <InfoTip text="Your gauge is what YOU actually knit — not what the pattern says. Knit a small square (called a swatch) with your yarn and needles, then count how many stitches fit across 4 inches." />
          </div>

          <UnitToggle value={yourUnit} onChange={setYourUnit} />

          <div className="grid grid-cols-2 gap-5">
            <BigInput
              value={yourSts}
              onChange={setYourSts}
              placeholder="e.g. 22"
              label="Stitches"
              tip="Count how many stitches fit across 4 inches of your own knitting. Place a ruler on your swatch and count the stitches between the 0 and 4 inch marks."
              accent
            />
            <BigInput
              value={yourRows}
              onChange={setYourRows}
              placeholder="e.g. 30"
              label="Rows"
              tip="Count how many rows fit in 4 inches of your knitting — measure from top to bottom. For crochet, count the number of rows between 0 and 4 inches."
              accent
            />
          </div>
        </div>

        {/* ── RESULTS ─────────────────────────────────────────────────────── */}
        {tab === "quick" && (
          <>
            {/* Perfect match */}
            {perfectMatch && (
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-8 mb-5 text-center">
                <div className="text-5xl mb-3">🎉</div>
                <h3 className="text-2xl font-bold text-emerald-800 mb-2">Your gauge matches the pattern perfectly!</h3>
                <p className="text-lg text-emerald-700">No adjustments needed — use the pattern exactly as written.</p>
              </div>
            )}

            {/* Scale results */}
            {hasScale && !perfectMatch && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-5">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Adjustment</h2>
                <p className="text-base text-gray-400 mb-6">
                  Here&apos;s how your gauge compares to the pattern&apos;s gauge.
                </p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <ResultBox
                    label="Stitch adjustment"
                    number={stitchScale! > 1
                      ? `+${((stitchScale! - 1) * 100).toFixed(0)}%`
                      : `-${((1 - stitchScale!) * 100).toFixed(0)}%`}
                    sub={stitchScale! > 1
                      ? "You knit tighter — you'll need more stitches"
                      : "You knit looser — you'll need fewer stitches"}
                    color={stitchScale! > 1 ? "blue" : "amber"}
                  />
                  <ResultBox
                    label="Row adjustment"
                    number={rowScale! > 1
                      ? `+${((rowScale! - 1) * 100).toFixed(0)}%`
                      : `-${((1 - rowScale!) * 100).toFixed(0)}%`}
                    sub={rowScale! > 1
                      ? "You knit tighter rows — you'll need more rows"
                      : "You knit looser rows — you'll need fewer rows"}
                    color={rowScale! > 1 ? "blue" : "amber"}
                  />
                </div>
                <div className="bg-gray-50 rounded-2xl px-6 py-4 flex items-center gap-3">
                  <span className="text-3xl">🧶</span>
                  <p className="text-lg text-gray-600">
                    Overall, you&apos;ll need{" "}
                    <strong className="text-gray-900">
                      {((stitchScale! * rowScale! - 1) * 100) > 0
                        ? `${((stitchScale! * rowScale! - 1) * 100).toFixed(0)}% more`
                        : `${((1 - stitchScale! * rowScale!) * 100).toFixed(0)}% less`}
                    </strong>{" "}
                    yarn than the pattern calls for.
                  </p>
                </div>
              </div>
            )}

            {!hasScale && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-5 text-center">
                <div className="text-5xl mb-4">👆</div>
                <p className="text-xl text-gray-500">Fill in Steps 1 and 2 above to see your results here.</p>
              </div>
            )}

            {/* Yardage calculator */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-500 flex-shrink-0">3</div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">How much yarn do you need?</h2>
                  <p className="text-base text-gray-400">Enter the yardage from your pattern</p>
                </div>
                <InfoTip text="Find the total yarn yardage on your pattern — it might say something like '500 yards worsted weight' or list it per skein. Add up all the skeins the pattern calls for." />
              </div>

              <div className="flex items-center gap-4 mb-6">
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 700"
                  value={origYardage}
                  onChange={(e) => setOrigYardage(e.target.value)}
                  className="w-48 text-2xl font-bold border-2 border-gray-200 focus:border-[#9b2335] focus:ring-4 focus:ring-[#9b2335]/20 rounded-2xl px-6 py-5 focus:outline-none transition-all bg-white placeholder:text-gray-300 placeholder:font-normal"
                />
                <span className="text-2xl font-semibold text-gray-500">yards</span>
              </div>

              {newYardage !== null ? (
                <div>
                  <ResultBox
                    label="You need"
                    number={Math.round(newYardage).toLocaleString()}
                    unit="yards"
                    sub={`That's ${toMeters(newYardage).toLocaleString()} meters${yardageDiff !== null && Math.abs(yardageDiff) > 2 ? ` — ${yardageDiff > 0 ? "+" : ""}${yardageDiff} yds compared to the pattern` : ""}`}
                    color="red"
                  />

                  {/* Skein calculator */}
                  <div className="mt-5 bg-gray-50 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-xl font-semibold text-gray-700">How many skeins should I buy?</h3>
                      <InfoTip text="Check the label on your yarn ball or skein — it will say how many yards (or meters) are in each one. Enter that number here." />
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 220"
                        value={skeinsYardage}
                        onChange={(e) => setSkeinsYardage(e.target.value)}
                        className="w-40 text-xl font-bold border-2 border-gray-200 focus:border-[#9b2335] focus:ring-4 focus:ring-[#9b2335]/20 rounded-2xl px-5 py-4 focus:outline-none transition-all bg-white placeholder:text-gray-300 placeholder:font-normal"
                      />
                      <span className="text-xl text-gray-500">yards per skein</span>
                      {skeinsNeeded !== null && (
                        <div className="flex items-center gap-3 bg-white border-2 border-[#9b2335]/30 rounded-2xl px-6 py-3">
                          <span className="text-4xl font-bold text-[#9b2335]">{skeinsNeeded}</span>
                          <span className="text-xl text-gray-500">{skeinsNeeded === 1 ? "skein" : "skeins"}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-2xl p-5">
                  <p className="text-lg text-gray-400">
                    {!hasScale ? "Fill in your gauges above first, then enter your yardage here." : "Enter the yards from your pattern to see how much you need."}
                  </p>
                </div>
              )}
            </div>

            {/* Stitch count converter */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-500 flex-shrink-0">4</div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Convert a single stitch count</h2>
                  <p className="text-base text-gray-400">Type any number from the pattern — get your number</p>
                </div>
                <InfoTip text="For example, if the pattern says 'Cast on 120 stitches', type 120 here and we'll tell you how many to cast on with your gauge." />
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <label className="text-base text-gray-500 mb-2 block">Pattern says</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 120"
                      value={customStitch}
                      onChange={(e) => setCustomStitch(e.target.value)}
                      className="w-40 text-2xl font-bold border-2 border-gray-200 focus:border-[#9b2335] focus:ring-4 focus:ring-[#9b2335]/20 rounded-2xl px-5 py-4 focus:outline-none transition-all bg-white placeholder:text-gray-300 placeholder:font-normal"
                    />
                    <span className="text-xl text-gray-500">stitches</span>
                  </div>
                </div>

                {newCustom !== null && (
                  <>
                    <div className="text-4xl text-gray-300 self-end pb-3">→</div>
                    <div>
                      <div className="text-base text-gray-400 mb-2">You use</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-bold text-[#9b2335]">{newCustom}</span>
                        <span className="text-2xl text-gray-500">stitches</span>
                      </div>
                      {newCustom !== Math.round(parseFloat(customStitch)) && (
                        <div className="text-base text-gray-400 mt-1">was: {customStitch} in the pattern</div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {!hasScale && (
                <p className="text-base text-gray-400 mt-4">Fill in both gauges above to use this converter.</p>
              )}
            </div>
          </>
        )}

        {/* ── REWRITE TAB ─────────────────────────────────────────────────── */}
        {tab === "rewrite" && (
          <>
            {!hasScale && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 mb-5 flex items-start gap-4">
                <span className="text-3xl">⚠️</span>
                <div>
                  <h3 className="text-xl font-bold text-amber-800 mb-1">Fill in your gauges first</h3>
                  <p className="text-lg text-amber-700">Go back to Steps 1 and 2 above to enter your gauge numbers before rewriting a pattern.</p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-5">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">Paste your pattern here</h2>
                <InfoTip text="Copy and paste the written instructions from your pattern — the part with 'Cast on X stitches, work Y rows' etc. You don't need to include the materials list or photos." />
              </div>
              <p className="text-lg text-gray-400 mb-5">
                We&apos;ll rewrite every stitch count and row count to match your gauge. Measurements in inches stay the same.
              </p>

              <textarea
                value={patternText}
                onChange={(e) => setPatternText(e.target.value)}
                placeholder={"Paste your pattern here. For example:\n\nCast on 120 sts. Join to work in the round.\nRounds 1–4: *k2, p2; repeat from * to end.\nWork until piece measures 10 inches from cast-on.\nNext round: k2tog, knit to last 2 sts, ssk. (118 sts)\nRepeat dec round every 6 rounds, 8 more times. (102 sts)\nCast off all sts.\nYarn: 480 yards worsted weight."}
                rows={10}
                className="w-full border-2 border-gray-200 focus:border-[#9b2335] focus:ring-4 focus:ring-[#9b2335]/20 rounded-2xl px-5 py-4 text-lg font-mono focus:outline-none resize-y transition-all leading-relaxed"
              />

              {hasScale && (
                <div className="mt-4 bg-gray-50 rounded-2xl px-5 py-3 flex items-center gap-2">
                  <span className="text-base text-gray-500">
                    Stitch scale <strong>{stitchScale!.toFixed(2)}×</strong> · Row scale <strong>{rowScale!.toFixed(2)}×</strong> · Yardage ×<strong>{(stitchScale! * rowScale!).toFixed(2)}</strong>
                  </span>
                </div>
              )}

              <div className="mt-5 flex gap-3">
                <button
                  onClick={handleRewrite}
                  disabled={!hasScale || !patternText.trim() || rewriting}
                  className="px-8 py-4 bg-[#9b2335] text-white text-xl font-semibold rounded-2xl hover:bg-[#7d1c2a] transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed shadow-sm"
                >
                  {rewriting ? "Rewriting your pattern…" : "Rewrite My Pattern"}
                </button>
                {patternText && !rewriting && (
                  <button
                    onClick={() => { setPatternText(""); setOutput(""); }}
                    className="px-5 py-4 text-lg text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {rewriteError && <p className="mt-3 text-lg text-red-500">{rewriteError}</p>}
            </div>

            {(output || rewriting) && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-gray-900">Your Rewritten Pattern</h2>
                    {rewriting && (
                      <span className="flex items-center gap-2 text-base text-[#9b2335] font-medium">
                        <span className="w-2 h-2 bg-[#9b2335] rounded-full animate-pulse" />
                        Writing…
                      </span>
                    )}
                  </div>
                  {output && !rewriting && (
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(output);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="text-lg font-semibold text-gray-600 hover:text-gray-900 border-2 border-gray-200 hover:border-gray-400 rounded-xl px-5 py-2.5 transition-all"
                    >
                      {copied ? "Copied! ✓" : "Copy to clipboard"}
                    </button>
                  )}
                </div>
                <div className="p-8">
                  <pre className="text-lg text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                    {output}
                    {rewriting && <span className="inline-block w-0.5 h-5 bg-[#9b2335] animate-pulse ml-1 align-middle" />}
                  </pre>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
