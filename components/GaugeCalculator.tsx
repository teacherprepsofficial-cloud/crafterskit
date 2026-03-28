"use client";
import { useState } from "react";

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item: any) => item.str).join(" "));
  }
  return pages.join("\n\n");
}
import Link from "next/link";

function perInch(v: number, unit: "inch" | "4inch") {
  return unit === "4inch" ? v / 4 : v;
}
function toMeters(y: number) { return Math.round(y * 0.9144); }

const blockLetters = (e: React.KeyboardEvent) => {
  if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
};

function InfoTip({ text, flipLeft }: { text: string; flipLeft?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center ml-2 align-middle">
      <button
        onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)} onBlur={() => setShow(false)}
        className="w-7 h-7 rounded-full border-2 border-dashed border-[#9b2335]/50 text-[#9b2335] text-sm font-bold flex items-center justify-center cursor-help hover:bg-[#9b2335] hover:text-white hover:border-solid transition-all duration-200"
      >i</button>
      {show && (
        <div className={`absolute ${flipLeft ? "right-9" : "left-9"} top-1/2 -translate-y-1/2 z-50 bg-gray-900 text-white text-base rounded-2xl px-4 py-3 w-80 shadow-2xl leading-relaxed pointer-events-none`}>
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
  const border = accent
    ? "border-[#9b2335]/40 hover:border-[#9b2335] focus:border-[#9b2335]"
    : "border-gray-300 hover:border-gray-500 focus:border-gray-600";
  return (
    <div className={`bg-white border-2 border-dashed ${accent ? "border-[#9b2335]/30 hover:border-[#9b2335]/60" : "border-gray-200 hover:border-gray-400"} rounded-3xl p-7 transition-all duration-200 hover:shadow-md`}>
      <div className="flex items-start justify-between mb-1">
        <h2 className={`text-2xl font-bold ${accent ? "text-[#9b2335]" : "text-gray-800"}`}>{label}</h2>
        <InfoTip text={tip} flipLeft={accent} />
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
          onWheel={(e) => e.currentTarget.blur()}
          onKeyDown={blockLetters}
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

// ─── PDF DROP ZONE ────────────────────────────────────────────────────────────
function PdfDropZone({ pdfName, onFile }: {
  pdfName: string;
  onFile: (file: File) => void;
}) {
  const [dragging, setDragging] = useState(false);

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setDragging(true); }
  function handleDragLeave() { setDragging(false); }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") onFile(file);
  }

  return (
    <label
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center w-full h-48 border-2 rounded-2xl cursor-pointer transition-all duration-200 ${
        dragging ? "border-solid border-[#9b2335] bg-[#9b2335]/10 scale-[1.01]"
          : pdfName ? "border-dashed border-[#9b2335]/40 bg-[#9b2335]/5 hover:bg-[#9b2335]/10"
          : "border-dashed border-gray-300 bg-gray-50 hover:bg-white hover:border-gray-400"
      }`}
    >
      <input type="file" accept=".pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      {pdfName ? (
        <div className="text-center pointer-events-none">
          <div className="text-4xl mb-2">📄</div>
          <p className="text-lg font-bold text-[#9b2335]">{pdfName}</p>
          <p className="text-base text-gray-400 mt-1">Click or drop to replace</p>
        </div>
      ) : (
        <div className="text-center pointer-events-none">
          <div className="text-4xl mb-2">{dragging ? "🎯" : "📎"}</div>
          <p className="text-lg font-bold text-gray-600">{dragging ? "Drop it!" : "Drag & drop your PDF here"}</p>
          <p className="text-base text-gray-400 mt-1">or click to browse your files</p>
        </div>
      )}
    </label>
  );
}

// ─── AI MODE ──────────────────────────────────────────────────────────────────
function AiMode() {
  const [patternText, setPatternText] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [inputMode, setInputMode] = useState<"paste" | "pdf">("paste");
  const [situation, setSituation] = useState("");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");

  async function handlePdfFile(file: File) {
    setPdfName(file.name);
    setPdfLoading(true);
    setErr("");
    try {
      const text = await extractPdfText(file);
      setPatternText(text);
    } catch {
      setErr("Couldn't read that PDF. Try copy-pasting the text instead.");
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleRun() {
    if (!patternText.trim() || !situation.trim()) return;
    setRunning(true); setOutput(""); setErr("");
    try {
      const res = await fetch("/api/gauge-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patternText, situation }),
      });
      if (!res.ok || !res.body) { setErr("Something went wrong. Try again."); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setOutput((p) => p + decoder.decode(value, { stream: true }));
      }
    } catch { setErr("Something went wrong. Try again."); }
    finally { setRunning(false); }
  }

  const ready = situation.trim().length > 0 && patternText.trim().length > 0 && !pdfLoading;

  return (
    <div className="space-y-6">

      {/* Box 1 — Pattern instructions */}
      <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-8 hover:border-gray-300 hover:shadow-md transition-all duration-200">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Step 1 — Paste the original pattern instructions here</h2>
        <p className="text-lg text-gray-400 mb-5">
          Copy and paste the written instructions from your pattern — the part that tells you how many stitches to cast on, how many rows to knit, etc.
          Or just upload the PDF directly.
        </p>

        {/* Paste / Upload toggle */}
        <div className="flex gap-2 mb-5">
          <button onClick={() => setInputMode("paste")}
            className={`px-5 py-2.5 rounded-xl text-base font-bold border-2 transition-all duration-200 ${inputMode === "paste" ? "bg-[#9b2335] border-[#9b2335] text-white" : "border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600"}`}>
            Paste text
          </button>
          <button onClick={() => setInputMode("pdf")}
            className={`px-5 py-2.5 rounded-xl text-base font-bold border-2 transition-all duration-200 ${inputMode === "pdf" ? "bg-[#9b2335] border-[#9b2335] text-white" : "border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600"}`}>
            Upload PDF
          </button>
        </div>

        {inputMode === "paste" ? (
          <textarea
            value={patternText}
            onChange={(e) => setPatternText(e.target.value)}
            rows={10}
            placeholder={"Paste the instructions here — for example:\n\nCast on 140 sts. Join in the round.\nKnit one round placing markers every 28 sts.\nWork chart repeats as desired.\nBind off all sts."}
            className="w-full border-2 border-dashed border-gray-200 hover:border-gray-300 focus:border-[#9b2335] focus:border-solid focus:ring-4 focus:ring-[#9b2335]/10 rounded-2xl px-5 py-4 text-lg font-mono focus:outline-none resize-y transition-all duration-200 leading-relaxed"
          />
        ) : pdfLoading ? (
          <div className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-[#9b2335]/30 rounded-2xl bg-[#9b2335]/5">
            <div className="text-4xl mb-2 animate-pulse">📖</div>
            <p className="text-lg font-bold text-[#9b2335]">Reading your pattern…</p>
            <p className="text-base text-gray-400 mt-1">Just a moment!</p>
          </div>
        ) : (
          <PdfDropZone pdfName={pdfName} onFile={handlePdfFile} />
        )}
      </div>

      {/* Box 2 — Describe situation */}
      <div className="bg-white border-2 border-dashed border-[#9b2335]/30 rounded-3xl p-8 hover:border-[#9b2335]/60 hover:shadow-md transition-all duration-200">
        <h2 className="text-3xl font-bold text-[#9b2335] mb-2">Step 2 — Let us know how you&apos;re looking to change the pattern</h2>
        <p className="text-lg text-gray-400 mb-6">
          You can just type in normal language and our AI calculator will figure it out.
        </p>
        <textarea
          value={situation}
          onChange={(e) => setSituation(e.target.value)}
          rows={5}
          placeholder={"Examples of what you might write:\n\n\"My yarn does 16 stitches per 4 inches. The pattern calls for 22.\"\n\n\"I'm using a much thicker yarn — Lion Brand Wool-Ease Thick & Quick on size 13 needles. My swatch came out to 12 stitches per 4 inches.\"\n\n\"I want to make the medium size but I knit very loosely so my gauge is always bigger than the pattern.\""}
          className="w-full border-2 border-dashed border-[#9b2335]/20 hover:border-[#9b2335]/40 focus:border-[#9b2335] focus:border-solid focus:ring-4 focus:ring-[#9b2335]/10 rounded-2xl px-5 py-4 text-lg focus:outline-none resize-y transition-all duration-200 leading-relaxed"
        />
      </div>

      {/* Button */}
      <button
        onClick={handleRun}
        disabled={!ready || running}
        className="w-full py-6 bg-[#9b2335] text-white text-2xl font-bold rounded-3xl hover:bg-[#7d1c2a] hover:scale-[1.01] cursor-pointer transition-all duration-200 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:scale-100 shadow-lg"
      >
        {running ? "✨ Rewriting your pattern…" : "✨ Rewrite My Pattern"}
      </button>
      {err && <p className="text-lg text-red-500 text-center">{err}</p>}

      {/* Output */}
      {(output || running) && (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl overflow-hidden hover:border-gray-300 transition-all duration-200">
          <div className="flex items-center justify-between px-8 py-5 border-b-2 border-dashed border-gray-200">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">Your Rewritten Pattern</h2>
              {running && (
                <span className="flex items-center gap-2 text-base text-[#9b2335] font-semibold">
                  <span className="w-2 h-2 bg-[#9b2335] rounded-full animate-pulse" />Writing…
                </span>
              )}
            </div>
            {output && !running && (
              <button
                onClick={async () => { await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="text-lg font-bold text-gray-600 hover:text-[#9b2335] border-2 border-dashed border-gray-300 hover:border-[#9b2335] rounded-xl px-5 py-2.5 transition-all duration-200 hover:scale-105"
              >
                {copied ? "Copied! ✓" : "Copy to clipboard"}
              </button>
            )}
          </div>
          <div className="p-8">
            <pre className="text-lg text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
              {output}
              {running && <span className="inline-block w-0.5 h-5 bg-[#9b2335] animate-pulse ml-1 align-middle" />}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CALCULATOR MODE ───────────────────────────────────────────────────────────
function CalcMode() {
  const [patSts, setPatSts] = useState("");
  const [patUnit, setPatUnit] = useState<"inch" | "4inch">("4inch");
  const [yourSts, setYourSts] = useState("");
  const [yourUnit, setYourUnit] = useState<"inch" | "4inch">("4inch");
  const [showRows, setShowRows] = useState(true);
  const [patRows, setPatRows] = useState("");
  const [patRowUnit, setPatRowUnit] = useState<"inch" | "4inch">("4inch");
  const [yourRows, setYourRows] = useState("");
  const [yourRowUnit, setYourRowUnit] = useState<"inch" | "4inch">("4inch");
  const [origYards, setOrigYards] = useState("");
  const [skeinsYards, setSkeinsYards] = useState("");
  const [yardUnit, setYardUnit] = useState<"yds" | "m">("yds");
  const [customSts, setCustomSts] = useState("");

  const pStsPerIn = patSts && +patSts > 0 ? perInch(+patSts, patUnit) : null;
  const yStsPerIn = yourSts && +yourSts > 0 ? perInch(+yourSts, yourUnit) : null;
  const stitchScale = pStsPerIn && yStsPerIn ? yStsPerIn / pStsPerIn : null;
  const pRowsPerIn = patRows && +patRows > 0 ? perInch(+patRows, patRowUnit) : null;
  const yRowsPerIn = yourRows && +yourRows > 0 ? perInch(+yourRows, yourRowUnit) : null;
  const rowScale = pRowsPerIn && yRowsPerIn ? yRowsPerIn / pRowsPerIn : stitchScale;
  const hasScale = stitchScale !== null;
  const perfect = hasScale && Math.abs(stitchScale! - 1) < 0.02;
  const origYardsNum = yardUnit === "m"
    ? parseFloat(origYards) * 1.09361
    : parseFloat(origYards);
  const newYards = hasScale && rowScale && !isNaN(origYardsNum) && origYardsNum > 0
    ? origYardsNum * stitchScale! * rowScale : null;
  const yardDiff = newYards !== null ? Math.round(newYards - origYardsNum) : null;
  const rowsEstimated = !pRowsPerIn || !yRowsPerIn;
  const skeinsNum = yardUnit === "m"
    ? parseFloat(skeinsYards) * 1.09361
    : parseFloat(skeinsYards);
  const skeinsNeeded = newYards && !isNaN(skeinsNum) && skeinsNum > 0
    ? Math.ceil(newYards / skeinsNum) : null;
  const custNum = parseFloat(customSts);
  const newCust = stitchScale && !isNaN(custNum) && custNum > 0
    ? Math.round(custNum * stitchScale) : null;
  const pctChange = stitchScale ? ((stitchScale - 1) * 100) : 0;
  const tighter = stitchScale !== null && stitchScale > 1;

  return (
    <div className="space-y-6">
      <Divider emoji="🧵" />

      {/* Gauge inputs — full width */}
      <div className="grid grid-cols-2 gap-5">
        <GaugeInput
          label="Pattern gauge" sublabel="From your pattern label or first page"
          value={patSts} onChange={setPatSts} unit={patUnit} onUnit={setPatUnit}
          tip="Every pattern lists a gauge — usually near the top. Look for something like '20 stitches = 4 inches on US 8 needles'. Enter that first number here."
        />
        <GaugeInput
          label="Your gauge" sublabel="From your yarn label — or your own swatch"
          value={yourSts} onChange={setYourSts} unit={yourUnit} onUnit={setYourUnit} accent
          tip="Your yarn's label shows a gauge range like '18–22 sts per 4 inches'. Use the middle number. Or knit a small test square and count your own stitches over 4 inches."
        />
      </div>

      {/* Gauge result — full width, between gauge inputs and yardage */}
      {hasScale && (
        perfect ? (
          <div className="bg-emerald-50 border-2 border-dashed border-emerald-200 rounded-2xl px-6 py-4 flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <span className="text-lg font-bold text-emerald-700">Perfect match!</span>
              <span className="text-base text-gray-400 ml-2">No adjustments needed.</span>
            </div>
          </div>
        ) : (
          <div className={`border-2 border-dashed rounded-2xl px-6 py-5 flex items-center gap-4 ${tighter ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200"}`}>
            <span className={`text-5xl font-bold ${tighter ? "text-[#9b2335]" : "text-emerald-600"}`}>
              {Math.abs(pctChange).toFixed(0)}% {tighter ? "tighter" : "looser"}
            </span>
            <span className="text-2xl text-gray-500">
              {tighter ? "— you'll need more yarn than the pattern." : "— you'll need less yarn than the pattern."}
            </span>
          </div>
        )
      )}

      <Divider emoji="🧶" />

      {/* Flex: yardage card (left) + BUY panel (right) */}
      <div className="flex gap-8 items-stretch">
        <div className="flex-1 min-w-0">
        {/* Yardage */}
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-8 hover:border-gray-300 hover:shadow-md transition-all duration-200">
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-3xl font-bold text-gray-900">How much yarn should you buy?</h2>
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1 shrink-0 ml-4 mt-1">
              {(["yds", "m"] as const).map((u) => (
                <button key={u} onClick={() => setYardUnit(u)}
                  className={`px-4 py-1.5 rounded-lg text-base font-bold transition-all duration-200 ${yardUnit === u ? "bg-white text-[#9b2335] shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
                  {u}
                </button>
              ))}
            </div>
          </div>
          <p className="text-lg text-gray-400 mb-7">Enter the {yardUnit === "m" ? "meterage" : "yardage"} from your pattern and the size of your yarn skeins.</p>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-xl font-bold text-gray-700 flex items-center mb-3">
                Pattern needs
                <InfoTip text="Find the total yards (or meters) your pattern requires — usually listed near the materials. Add up all the skeins the pattern calls for. For example, '3 skeins × 220 yards = 660 yards total'." />
              </label>
              <div className="flex items-center gap-3">
                <input type="number" min="0" placeholder={yardUnit === "m" ? "e.g. 600" : "e.g. 660"} value={origYards}
                  onChange={(e) => setOrigYards(e.target.value)} onWheel={(e) => e.currentTarget.blur()} onKeyDown={blockLetters}
                  className="w-44 text-4xl font-bold border-2 border-dashed border-gray-300 hover:border-[#9b2335]/50 focus:border-[#9b2335] focus:border-solid focus:ring-4 focus:ring-[#9b2335]/10 rounded-2xl px-5 py-4 focus:outline-none transition-all duration-200 bg-white placeholder:text-gray-200 placeholder:font-normal placeholder:text-2xl" />
                <span className="text-xl text-gray-400 font-medium">{yardUnit === "m" ? "meters" : "yards"}</span>
              </div>
            </div>
            <div>
              <label className="text-xl font-bold text-gray-700 flex items-center mb-3">
                Each skein has
                <InfoTip text="Check the label on your yarn — it will say how many yards (or meters) are in each ball or skein. Enter that number here." />
              </label>
              <div className="flex items-center gap-3">
                <input type="number" min="0" placeholder={yardUnit === "m" ? "e.g. 200" : "e.g. 220"} value={skeinsYards}
                  onChange={(e) => setSkeinsYards(e.target.value)} onWheel={(e) => e.currentTarget.blur()} onKeyDown={blockLetters}
                  className="w-44 text-4xl font-bold border-2 border-dashed border-gray-300 hover:border-[#9b2335]/50 focus:border-[#9b2335] focus:border-solid focus:ring-4 focus:ring-[#9b2335]/10 rounded-2xl px-5 py-4 focus:outline-none transition-all duration-200 bg-white placeholder:text-gray-200 placeholder:font-normal placeholder:text-2xl" />
                <span className="text-xl text-gray-400 font-medium">{yardUnit === "m" ? "meters" : "yards"}</span>
              </div>
            </div>
          </div>

          {/* Yards result — inline, right below yardage inputs */}
          {newYards !== null && (
            <div className="mt-6 pt-6 border-t-2 border-dashed border-gray-100 flex items-baseline gap-3 flex-wrap">
              <span className="text-base text-gray-400">You need</span>
              {yardUnit === "m" ? (
                <>
                  <span className="text-5xl font-bold text-gray-900">{Math.round(newYards / 1.09361).toLocaleString()}</span>
                  <span className="text-xl text-gray-400">meters</span>
                  <span className="text-base text-gray-400">({Math.round(newYards).toLocaleString()} yds)</span>
                </>
              ) : (
                <>
                  <span className="text-5xl font-bold text-gray-900">{Math.round(newYards).toLocaleString()}</span>
                  <span className="text-xl text-gray-400">yards</span>
                  <span className="text-base text-gray-400">({toMeters(newYards).toLocaleString()} m)</span>
                </>
              )}
              {yardDiff !== null && Math.abs(yardDiff) > 5 && (
                <span className={`text-base font-semibold ${yardDiff > 0 ? "text-[#9b2335]" : "text-emerald-600"}`}>
                  · {yardDiff > 0
                    ? `+${yardUnit === "m" ? Math.round(yardDiff / 1.09361) : yardDiff} more than the pattern`
                    : `${yardUnit === "m" ? Math.round(Math.abs(yardDiff) / 1.09361) : Math.abs(yardDiff)} less than the pattern`}
                </span>
              )}
            </div>
          )}
        </div>
        </div>

        {/* BUY panel — right side of flex, same height as yardage card */}
        {skeinsNeeded !== null && (
          <div className="w-72 shrink-0">
            <div className="bg-emerald-500 text-white rounded-3xl p-8 text-center hover:scale-[1.02] cursor-pointer transition-all duration-300 h-full flex flex-col items-center justify-center">
              <p className="text-base font-semibold opacity-70 uppercase tracking-widest mb-1">Buy</p>
              <div className="text-9xl font-bold leading-none">{skeinsNeeded}</div>
              <div className="text-3xl font-semibold mt-2 opacity-90">{skeinsNeeded === 1 ? "skein" : "skeins"}</div>
              {newYards && (
                <div className="mt-4 text-sm opacity-70">
                  {yardUnit === "m"
                    ? `${Math.round(newYards / 1.09361).toLocaleString()} meters total`
                    : `${Math.round(newYards).toLocaleString()} yards total`}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Row gauge — full width */}
      <div className="border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden hover:border-gray-300 transition-all duration-200">
        <button onClick={() => setShowRows(!showRows)}
          className="w-full px-7 py-5 flex items-center justify-between text-left hover:bg-white transition-all duration-200">
          <div>
            <span className="text-lg font-bold text-gray-700">Add row gauge for more accurate yardage</span>
            <span className="text-base text-gray-400 ml-3">(optional)</span>
          </div>
          <span className="text-2xl text-gray-400">{showRows ? "↑" : "↓"}</span>
        </button>
        {showRows && (
          <div className="px-7 pb-7 bg-white border-t-2 border-dashed border-gray-200">
            <p className="text-base text-gray-400 mt-5 mb-5">Row gauge affects how much yarn you need but most yarn labels don&apos;t show it. Only fill this in if you&apos;ve actually measured rows on a swatch.</p>
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
                    <input type="number" min="0" step="0.5" placeholder="e.g. 28" value={val}
                      onChange={(e) => set(e.target.value)} onWheel={(e) => e.currentTarget.blur()} onKeyDown={blockLetters}
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

      {/* Stitch converter — full width */}
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
              <input type="number" min="0" placeholder="e.g. 120" value={customSts}
                onChange={(e) => setCustomSts(e.target.value)} onWheel={(e) => e.currentTarget.blur()} onKeyDown={blockLetters}
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

      <div className="h-8" />
    </div>
  );
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────
export default function GaugeCalculator({ username }: { username: string }) {
  const [mode, setMode] = useState<"ai" | "calc">("ai");

  return (
    <div className="min-h-screen" style={{ background: "#f7f3ee" }}>
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

      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Page title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-3">Gauge Calculator</h1>
          <p className="text-xl text-gray-500">Using a different yarn than your pattern? We&apos;ll help rewrite the plan with your specifications!</p>
        </div>

        {/* ── TOGGLE ── */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex bg-white border-2 border-dashed border-gray-200 rounded-2xl p-1.5 gap-1">
            <button
              onClick={() => setMode("ai")}
              className={`px-10 py-4 rounded-xl text-2xl font-bold transition-all duration-200 ${
                mode === "ai"
                  ? "bg-[#9b2335] text-white shadow-md"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              ✨ AI
            </button>
            <button
              onClick={() => setMode("calc")}
              className={`px-10 py-4 rounded-xl text-2xl font-bold transition-all duration-200 ${
                mode === "calc"
                  ? "bg-[#9b2335] text-white shadow-md"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              🧮 Calculator
            </button>
          </div>
        </div>

        {mode === "ai" ? <AiMode /> : <CalcMode />}
      </div>
    </div>
  );
}
