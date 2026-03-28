"use client";
import { useState } from "react";
import Link from "next/link";

function perInch(v: number, unit: "inch" | "4inch") {
  return unit === "4inch" ? v / 4 : v;
}
function toMeters(y: number) { return Math.round(y * 0.9144); }

function InfoTip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center ml-2 align-middle">
      <button
        onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)} onBlur={() => setShow(false)}
        className="w-7 h-7 rounded-full border-2 border-dashed border-[#9b2335]/50 text-[#9b2335] text-sm font-bold flex items-center justify-center cursor-help hover:bg-[#9b2335] hover:text-white hover:border-solid transition-all duration-200"
      >i</button>
      {show && (
        <div className="absolute left-9 top-1/2 -translate-y-1/2 z-50 bg-gray-900 text-white text-base rounded-2xl px-4 py-3 w-80 shadow-2xl leading-relaxed pointer-events-none">
          {text}
        </div>
      )}
    </span>
  );
}

function GaugeInput({
  label, sublabel, value, onChange, unit, onUnit, accent, tip,
}: {
  label: string; sublabel: string; value: string; onChange: (v: string) => void;
  unit: "inch" | "4inch"; onUnit: (u: "inch" | "4inch") => void;
  accent?: boolean; tip: string;
}) {
  const border = accent ? "border-[#9b2335]/40 hover:border-[#9b2335] focus:border-[#9b2335]" : "border-gray-300 hover:border-gray-500 focus:border-gray-600";
  return (
    <div className={`bg-white border-2 border-dashed ${accent ? "border-[#9b2335]/30 hover:border-[#9b2335]/60" : "border-gray-200 hover:border-gray-400"} rounded-3xl p-7 transition-all duration-200 hover:shadow-md`}>
      <div className="flex items-start justify-between mb-1">
        <h2 className={`text-2xl font-bold ${accent ? "text-[#9b2335]" : "text-gray-800"}`}>{label}</h2>
        <InfoTip text={tip} />
      </div>
      <p className="text-base text-gray-400 mb-5">{sublabel}</p>

      <div className="flex gap-2 mb-5">
        {(["4inch", "inch"] as const).map((u) => (
          <button key={u} onClick={() => onUnit(u)}
            className={`px-4 py-2 rounded-xl text-base font-semibold border-2 transition-all duration-200 ${unit === u ? "border-solid bg-[#9b2335] border-[#9b2335] text-white" : "border-dashed border-gray-300 text-gray-400 hover:border-[#9b2335]/40 hover:text-[#9b2335]"}`}>
            {u === "4inch" ? "per 4 in / 10 cm" : "per inch"}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <input
          type="number" min="0" step="0.5" placeholder="e.g. 20" value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-40 text-5xl font-bold border-2 border-dashed ${border} focus:border-solid rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-[#9b2335]/10 transition-all duration-200 bg-white placeholder:text-gray-200 placeholder:text-3xl placeholder:font-normal`}
        />
        <span className="text-xl text-gray-400 font-medium leading-tight">
          stitches<br />
          <span className="text-base">{unit === "4inch" ? "per 4 inches" : "per inch"}</span>
        </span>
      </div>
    </div>
  );
}

function Divider({ emoji }: { emoji: string }) {
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="flex-1 border-t-2 border-dashed border-[#9b2335]/20" />
      <span className="text-2xl">{emoji}</span>
      <div className="flex-1 border-t-2 border-dashed border-[#9b2335]/20" />
    </div>
  );
}

export default function GaugeCalculator({ username }: { username: string }) {
  // Gauge
  const [patSts, setPatSts] = useState("");
  const [patUnit, setPatUnit] = useState<"inch" | "4inch">("4inch");
  const [yourSts, setYourSts] = useState("");
  const [yourUnit, setYourUnit] = useState<"inch" | "4inch">("4inch");

  // Rows (optional)
  const [showRows, setShowRows] = useState(false);
  const [patRows, setPatRows] = useState("");
  const [patRowUnit, setPatRowUnit] = useState<"inch" | "4inch">("4inch");
  const [yourRows, setYourRows] = useState("");
  const [yourRowUnit, setYourRowUnit] = useState<"inch" | "4inch">("4inch");

  // Yardage
  const [origYards, setOrigYards] = useState("");
  const [skeinsYards, setSkeinsYards] = useState("");

  // Stitch converter
  const [customSts, setCustomSts] = useState("");

  // Rewrite
  const [patternText, setPatternText] = useState("");
  const [output, setOutput] = useState("");
  const [rewriting, setRewriting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rewriteErr, setRewriteErr] = useState("");

  // Computed
  const pStsPerIn = patSts && +patSts > 0 ? perInch(+patSts, patUnit) : null;
  const yStsPerIn = yourSts && +yourSts > 0 ? perInch(+yourSts, yourUnit) : null;
  const stitchScale = pStsPerIn && yStsPerIn ? yStsPerIn / pStsPerIn : null;

  const pRowsPerIn = patRows && +patRows > 0 ? perInch(+patRows, patRowUnit) : null;
  const yRowsPerIn = yourRows && +yourRows > 0 ? perInch(+yourRows, yourRowUnit) : null;
  const rowScale = pRowsPerIn && yRowsPerIn ? yRowsPerIn / pRowsPerIn : stitchScale; // default to stitchScale if rows not entered

  const hasScale = stitchScale !== null;
  const perfect = hasScale && Math.abs(stitchScale! - 1) < 0.02;

  const origYardsNum = parseFloat(origYards);
  const newYards = hasScale && rowScale && !isNaN(origYardsNum) && origYardsNum > 0
    ? origYardsNum * stitchScale! * rowScale : null;
  const yardDiff = newYards !== null ? Math.round(newYards - origYardsNum) : null;
  const rowsEstimated = !pRowsPerIn || !yRowsPerIn; // true if rows weren't entered

  const skeinsNum = parseFloat(skeinsYards);
  const skeinsNeeded = newYards && !isNaN(skeinsNum) && skeinsNum > 0
    ? Math.ceil(newYards / skeinsNum) : null;

  const custNum = parseFloat(customSts);
  const newCust = stitchScale && !isNaN(custNum) && custNum > 0
    ? Math.round(custNum * stitchScale) : null;

  const pctChange = stitchScale ? ((stitchScale - 1) * 100) : 0;
  const tighter = stitchScale !== null && stitchScale > 1;

  async function handleRewrite() {
    if (!hasScale || !patternText.trim()) return;
    setRewriting(true); setOutput(""); setRewriteErr("");
    try {
      const res = await fetch("/api/gauge-convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patternText,
          patternStitchesPerInch: pStsPerIn,
          patternRowsPerInch: pRowsPerIn ?? pStsPerIn,
          yourStitchesPerInch: yStsPerIn,
          yourRowsPerInch: yRowsPerIn ?? yStsPerIn,
          stitchScale,
          rowScale,
        }),
      });
      if (!res.ok || !res.body) { setRewriteErr("Something went wrong. Try again."); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setOutput((p) => p + decoder.decode(value, { stream: true }));
      }
    } catch { setRewriteErr("Something went wrong. Try again."); }
    finally { setRewriting(false); }
  }

  return (
    <div className="min-h-screen" style={{ background: "#f7f3ee" }}>
      {/* Header */}
      <header className="bg-white border-b-2 border-dashed border-[#9b2335]/20 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-bold text-gray-900 hover:text-[#9b2335] transition-colors">CraftersKit</Link>
          <span className="text-[#9b2335]/30 text-xl font-bold">- - -</span>
          <span className="text-lg font-bold text-[#9b2335]">Gauge Calculator</span>
        </div>
        {username && (
          <div className="flex items-center gap-4">
            <span className="text-base text-gray-400">@{username}</span>
            <a href="/api/auth/signout" className="text-base text-gray-400 hover:text-[#9b2335] transition-colors">Sign out</a>
          </div>
        )}
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        <div className="mb-2">
          <Link href="/" className="text-base text-gray-400 hover:text-[#9b2335] transition-colors inline-flex items-center gap-1 mb-4 block">← Back to search</Link>
          <h1 className="text-5xl font-bold text-gray-900 mb-2">Gauge Calculator</h1>
          <p className="text-xl text-gray-500">Using different yarn than your pattern calls for? Tell us the two gauges — we'll tell you exactly how much to buy.</p>
        </div>

        <Divider emoji="🧵" />

        {/* ── GAUGE INPUTS ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-5">
          <GaugeInput
            label="Pattern gauge"
            sublabel="From your pattern label or first page"
            value={patSts} onChange={setPatSts}
            unit={patUnit} onUnit={setPatUnit}
            tip="Every pattern lists a gauge — usually near the top. Look for something like '20 stitches = 4 inches on US 8 needles'. Enter that first number here."
          />
          <GaugeInput
            label="Your gauge"
            sublabel="From your yarn label — or your own swatch"
            value={yourSts} onChange={setYourSts}
            unit={yourUnit} onUnit={setYourUnit}
            accent
            tip="Your yarn's label shows a gauge range like '18–22 sts per 4 inches'. Use the middle number. Or — even better — knit a small test square and count your own stitches over 4 inches."
          />
        </div>

        {/* ── INSTANT GAUGE RESULT ─────────────────────────────────────── */}
        {hasScale && (
          perfect ? (
            <div className="bg-emerald-50 border-2 border-solid border-emerald-300 rounded-3xl p-7 text-center">
              <div className="text-5xl mb-2">🎉</div>
              <h3 className="text-3xl font-bold text-emerald-800">Your gauge matches the pattern perfectly!</h3>
              <p className="text-xl text-emerald-700 mt-2">Use the pattern exactly as written — no adjustments needed.</p>
            </div>
          ) : (
            <div className={`border-2 border-dashed rounded-3xl p-6 ${tighter ? "bg-blue-50 border-blue-300" : "bg-amber-50 border-amber-300"}`}>
              <p className="text-xl font-semibold text-gray-700">
                You knit{" "}
                <strong className={tighter ? "text-blue-700" : "text-amber-700"}>
                  {Math.abs(pctChange).toFixed(0)}% {tighter ? "tighter" : "looser"}
                </strong>
                {" "}than the pattern — so for every stitch the pattern calls for, you'll use{" "}
                <strong>{stitchScale!.toFixed(2)} stitches</strong>.
                {tighter
                  ? " That means more stitches and more yarn."
                  : " That means fewer stitches and less yarn."}
              </p>
            </div>
          )
        )}

        {!hasScale && (
          <div className="border-2 border-dashed border-gray-200 rounded-3xl p-6 text-center text-gray-400 text-xl">
            Enter both gauges above to see your results ↑
          </div>
        )}

        <Divider emoji="🧶" />

        {/* ── YARDAGE + SKEIN ──────────────────────────────────────────── */}
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-8 hover:border-gray-300 hover:shadow-md transition-all duration-200">
          <h2 className="text-3xl font-bold text-gray-900 mb-1">How much yarn should you buy?</h2>
          <p className="text-lg text-gray-400 mb-7">Enter the yardage from your pattern and the size of your yarn skeins.</p>

          <div className="grid grid-cols-2 gap-6 mb-7">
            <div>
              <label className="text-xl font-bold text-gray-700 flex items-center mb-3">
                Pattern needs
                <InfoTip text="Find the total yards your pattern requires — usually listed near the materials. Add up all the skeins the pattern calls for. For example, '3 skeins × 220 yards = 660 yards total'." />
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number" min="0" placeholder="e.g. 660" value={origYards}
                  onChange={(e) => setOrigYards(e.target.value)}
                  className="w-44 text-4xl font-bold border-2 border-dashed border-gray-300 hover:border-[#9b2335]/50 focus:border-[#9b2335] focus:border-solid focus:ring-4 focus:ring-[#9b2335]/10 rounded-2xl px-5 py-4 focus:outline-none transition-all duration-200 bg-white placeholder:text-gray-200 placeholder:font-normal placeholder:text-2xl"
                />
                <span className="text-xl text-gray-400 font-medium">yards</span>
              </div>
            </div>

            <div>
              <label className="text-xl font-bold text-gray-700 flex items-center mb-3">
                Each skein has
                <InfoTip text="Check the label on your yarn — it will say how many yards (or meters) are in each ball or skein. Enter that number here." />
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number" min="0" placeholder="e.g. 220" value={skeinsYards}
                  onChange={(e) => setSkeinsYards(e.target.value)}
                  className="w-44 text-4xl font-bold border-2 border-dashed border-gray-300 hover:border-[#9b2335]/50 focus:border-[#9b2335] focus:border-solid focus:ring-4 focus:ring-[#9b2335]/10 rounded-2xl px-5 py-4 focus:outline-none transition-all duration-200 bg-white placeholder:text-gray-200 placeholder:font-normal placeholder:text-2xl"
                />
                <span className="text-xl text-gray-400 font-medium">yards</span>
              </div>
            </div>
          </div>

          {/* THE BIG ANSWER */}
          {skeinsNeeded !== null ? (
            <div className="bg-[#9b2335] rounded-3xl p-8 text-white text-center hover:scale-[1.01] transition-all duration-200">
              <div className="text-lg font-semibold uppercase tracking-widest mb-2 opacity-70">Buy</div>
              <div className="text-9xl font-bold leading-none">{skeinsNeeded}</div>
              <div className="text-3xl font-semibold mt-2 opacity-90">{skeinsNeeded === 1 ? "skein" : "skeins"}</div>
              {newYards && (
                <div className="mt-4 text-lg opacity-70">
                  That's {Math.round(newYards).toLocaleString()} yards ({toMeters(newYards).toLocaleString()} m)
                  {yardDiff !== null && Math.abs(yardDiff) > 5 && ` — ${yardDiff > 0 ? "+" : ""}${yardDiff} yds vs. the pattern`}
                  {rowsEstimated && origYards ? " · Add ~5% buffer since row gauge wasn't entered" : ""}
                </div>
              )}
            </div>
          ) : newYards !== null ? (
            <div className="bg-[#9b2335]/5 border-2 border-dashed border-[#9b2335]/30 rounded-3xl p-8 hover:border-[#9b2335]/50 transition-all duration-200">
              <div className="text-lg font-semibold text-[#9b2335] uppercase tracking-widest mb-2">You need</div>
              <div className="text-7xl font-bold text-[#9b2335]">{Math.round(newYards!).toLocaleString()}</div>
              <div className="text-2xl text-gray-500 mt-1">yards ({toMeters(newYards!).toLocaleString()} m)</div>
              {yardDiff !== null && Math.abs(yardDiff) > 5 && (
                <div className={`mt-2 text-lg font-semibold ${yardDiff > 0 ? "text-blue-600" : "text-amber-600"}`}>
                  {yardDiff > 0 ? "+" : ""}{yardDiff} yards compared to the pattern
                </div>
              )}
              <p className="text-base text-gray-400 mt-4">Enter your skein size above to get an exact skein count.</p>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-200 rounded-3xl p-8 text-center text-gray-400 text-xl">
              {!hasScale ? "Enter both gauges above first" : "Enter the yards your pattern needs"}
            </div>
          )}
        </div>

        {/* ── OPTIONAL: ROW GAUGE ──────────────────────────────────────── */}
        <div className="border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden hover:border-gray-300 transition-all duration-200">
          <button
            onClick={() => setShowRows(!showRows)}
            className="w-full px-7 py-5 flex items-center justify-between text-left hover:bg-white transition-all duration-200"
          >
            <div>
              <span className="text-lg font-bold text-gray-700">Add row gauge for more accurate yardage</span>
              <span className="text-base text-gray-400 ml-3">(optional — most people skip this)</span>
            </div>
            <span className="text-2xl text-gray-400">{showRows ? "↑" : "↓"}</span>
          </button>

          {showRows && (
            <div className="px-7 pb-7 bg-white border-t-2 border-dashed border-gray-200">
              <p className="text-base text-gray-400 mt-5 mb-5">
                Row gauge affects how much yarn you need but most yarn labels don&apos;t show it. Only fill this in if you&apos;ve actually measured rows on a swatch.
              </p>
              <div className="grid grid-cols-2 gap-5">
                {[
                  { label: "Pattern rows", val: patRows, set: setPatRows, unit: patRowUnit, setUnit: setPatRowUnit },
                  { label: "Your rows", val: yourRows, set: setYourRows, unit: yourRowUnit, setUnit: setYourRowUnit },
                ].map(({ label, val, set, unit, setUnit }) => (
                  <div key={label}>
                    <label className="text-lg font-bold text-gray-700 block mb-3">{label}</label>
                    <div className="flex gap-2 mb-3">
                      {(["4inch", "inch"] as const).map((u) => (
                        <button key={u} onClick={() => setUnit(u)}
                          className={`px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${unit === u ? "border-solid bg-[#9b2335] border-[#9b2335] text-white" : "border-dashed border-gray-300 text-gray-400 hover:border-[#9b2335]/40"}`}>
                          {u === "4inch" ? "per 4 in" : "per inch"}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="number" min="0" step="0.5" placeholder="e.g. 28" value={val} onChange={(e) => set(e.target.value)}
                        className="w-32 text-3xl font-bold border-2 border-dashed border-gray-300 hover:border-[#9b2335]/50 focus:border-[#9b2335] focus:border-solid rounded-xl px-4 py-3 focus:outline-none transition-all duration-200 bg-white placeholder:text-gray-200 placeholder:font-normal" />
                      <span className="text-base text-gray-400">rows {unit === "4inch" ? "per 4 in" : "per in"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Divider emoji="📐" />

        {/* ── STITCH CONVERTER ─────────────────────────────────────────── */}
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-8 hover:border-gray-300 hover:shadow-md transition-all duration-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-1 flex items-center">
            Convert a single stitch count
            <InfoTip text="For example: your pattern says 'Cast on 120 stitches'. Type 120 here and we'll tell you how many to cast on with your yarn." />
          </h2>
          <p className="text-lg text-gray-400 mb-6">Pattern says to cast on X stitches — how many do YOU use?</p>

          <div className="flex items-center gap-5 flex-wrap">
            <div>
              <label className="text-base text-gray-500 mb-2 block">Pattern says</label>
              <div className="flex items-center gap-3">
                <input type="number" min="0" placeholder="e.g. 120" value={customSts} onChange={(e) => setCustomSts(e.target.value)}
                  className="w-40 text-4xl font-bold border-2 border-dashed border-gray-300 hover:border-[#9b2335]/50 focus:border-[#9b2335] focus:border-solid focus:ring-4 focus:ring-[#9b2335]/10 rounded-2xl px-5 py-4 focus:outline-none transition-all duration-200 bg-white placeholder:text-gray-200 placeholder:font-normal" />
                <span className="text-xl text-gray-400">sts</span>
              </div>
            </div>
            {newCust !== null ? (
              <>
                <div className="text-5xl text-gray-200 self-end pb-4">→</div>
                <div>
                  <div className="text-base text-gray-400 mb-2">You use</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-bold text-[#9b2335]">{newCust}</span>
                    <span className="text-2xl text-gray-400">stitches</span>
                  </div>
                  {newCust !== Math.round(custNum) && <div className="text-base text-gray-400 mt-1">was {customSts} in the pattern</div>}
                </div>
              </>
            ) : (
              <p className="text-lg text-gray-400 self-end pb-4">
                {!hasScale ? "Enter both gauges at the top first" : "Enter a stitch count to convert"}
              </p>
            )}
          </div>
        </div>

        <Divider emoji="✂️" />

        {/* ── PATTERN REWRITE ──────────────────────────────────────────── */}
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-8 hover:border-gray-300 hover:shadow-md transition-all duration-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-1 flex items-center">
            Rewrite my entire pattern
            <InfoTip text="Paste the written instructions from your pattern. We'll rewrite every single stitch count and row count to match your gauge. Measurements in inches won't change." />
          </h2>
          <p className="text-lg text-gray-400 mb-5">
            Paste your pattern below and we&apos;ll adjust every stitch count, row count, and cast-on — automatically.
          </p>

          {!hasScale && (
            <div className="mb-5 border-2 border-dashed border-amber-200 bg-amber-50 rounded-2xl px-5 py-3 text-base text-amber-700">
              ⚠️ Enter both gauges at the top of the page before rewriting.
            </div>
          )}

          <textarea value={patternText} onChange={(e) => setPatternText(e.target.value)} rows={10}
            placeholder={"Paste your pattern here. For example:\n\nCast on 120 sts. Join to work in the round.\nRounds 1–4: *k2, p2; repeat from * to end.\nWork until piece measures 10 inches from cast-on.\nNext round: k2tog, knit to last 2 sts, ssk. (118 sts)\nRepeat dec round every 6 rounds, 8 more times. (102 sts)\nCast off all sts.\nYarn: 480 yards worsted weight."}
            className="w-full border-2 border-dashed border-gray-200 hover:border-gray-300 focus:border-[#9b2335] focus:border-solid focus:ring-4 focus:ring-[#9b2335]/10 rounded-2xl px-5 py-4 text-lg font-mono focus:outline-none resize-y transition-all duration-200 leading-relaxed"
          />

          <div className="mt-5 flex gap-3">
            <button onClick={handleRewrite} disabled={!hasScale || !patternText.trim() || rewriting}
              className="px-8 py-4 bg-[#9b2335] text-white text-xl font-bold rounded-2xl hover:bg-[#7d1c2a] hover:scale-105 transition-all duration-200 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:scale-100 shadow-md">
              {rewriting ? "Rewriting your pattern…" : "Rewrite My Pattern"}
            </button>
            {patternText && !rewriting && (
              <button onClick={() => { setPatternText(""); setOutput(""); }}
                className="px-5 py-4 text-lg text-gray-400 hover:text-[#9b2335] transition-colors">
                Clear
              </button>
            )}
          </div>
          {rewriteErr && <p className="mt-3 text-lg text-red-500">{rewriteErr}</p>}
        </div>

        {/* Output */}
        {(output || rewriting) && (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl overflow-hidden hover:border-gray-300 transition-all duration-200">
            <div className="flex items-center justify-between px-8 py-5 border-b-2 border-dashed border-gray-200">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900">Your Rewritten Pattern</h2>
                {rewriting && <span className="flex items-center gap-2 text-base text-[#9b2335] font-semibold"><span className="w-2 h-2 bg-[#9b2335] rounded-full animate-pulse" />Writing…</span>}
              </div>
              {output && !rewriting && (
                <button onClick={async () => { await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="text-lg font-bold text-gray-600 hover:text-[#9b2335] border-2 border-dashed border-gray-300 hover:border-[#9b2335] rounded-xl px-5 py-2.5 transition-all duration-200 hover:scale-105">
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

        <div className="h-8" />
      </div>
    </div>
  );
}
