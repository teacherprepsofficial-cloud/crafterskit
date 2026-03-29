"use client";

import { useState } from "react";
import Link from "next/link";

interface ChartData {
  title: string;
  craft: string;
  stitches: number;
  rows: number;
  grid: string[][];
  key: Record<string, string>;
  notes: string;
}

// Symbol → display config
const SYMBOL_STYLE: Record<string, { bg: string; color: string; text: string; fontSize: string }> = {
  "□": { bg: "#ffffff", color: "#1a1a1a", text: "", fontSize: "11px" },
  "■": { bg: "#1a1a1a", color: "#ffffff", text: "", fontSize: "11px" },
  "O": { bg: "#ffffff", color: "#1a1a1a", text: "O", fontSize: "11px" },
  "o": { bg: "#ffffff", color: "#1a1a1a", text: "O", fontSize: "11px" },
  "/": { bg: "#ffffff", color: "#be123c", text: "/", fontSize: "13px" },
  "\\": { bg: "#ffffff", color: "#be123c", text: "\\", fontSize: "13px" },
  "·": { bg: "#ffffff", color: "#1a1a1a", text: "•", fontSize: "10px" },
  ".": { bg: "#ffffff", color: "#1a1a1a", text: "•", fontSize: "10px" },
  "X": { bg: "#ffffff", color: "#1a1a1a", text: "✕", fontSize: "10px" },
  "A": { bg: "#fdf4ff", color: "#1a1a1a", text: "A", fontSize: "9px" },
  "B": { bg: "#eff6ff", color: "#1a1a1a", text: "B", fontSize: "9px" },
  "C": { bg: "#fefce8", color: "#1a1a1a", text: "C", fontSize: "9px" },
};

function getStyle(sym: string) {
  return SYMBOL_STYLE[sym] ?? { bg: "#f5f5f5", color: "#1a1a1a", text: sym, fontSize: "9px" };
}

function ChartGrid({ chart, cellSize = 26 }: { chart: ChartData; cellSize?: number }) {
  const reversedGrid = [...chart.grid].reverse(); // display top row first
  const numRows = reversedGrid.length;

  return (
    <div className="overflow-x-auto">
      <div style={{ display: "inline-block", fontFamily: "monospace" }}>
        {reversedGrid.map((row, displayIdx) => {
          const rowNum = numRows - displayIdx; // actual row number (1 at bottom)
          const isRS = rowNum % 2 === 1;
          return (
            <div key={displayIdx} style={{ display: "flex", alignItems: "center", gap: 0 }}>
              {/* Row number left */}
              <div style={{ width: 28, textAlign: "right", paddingRight: 6, fontSize: 10, color: isRS ? "#be123c" : "#888", fontWeight: isRS ? 700 : 400 }}>
                {rowNum}
              </div>
              {/* Cells */}
              {row.map((sym, ci) => {
                const s = getStyle(sym);
                return (
                  <div
                    key={ci}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      background: s.bg,
                      border: "1px solid #ccc",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: s.fontSize,
                      color: s.color,
                      lineHeight: 1,
                      userSelect: "none",
                    }}
                  >
                    {s.text}
                  </div>
                );
              })}
              {/* RS/WS indicator right */}
              <div style={{ width: 32, paddingLeft: 6, fontSize: 9, color: isRS ? "#be123c" : "#aaa" }}>
                {isRS ? "RS →" : "← WS"}
              </div>
            </div>
          );
        })}
        {/* Stitch numbers at bottom */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ width: 28 }} />
          {Array.from({ length: chart.stitches }, (_, i) => chart.stitches - i).map((n) => (
            <div key={n} style={{ width: cellSize, textAlign: "center", fontSize: 9, color: "#888", paddingTop: 3 }}>
              {n % 5 === 0 || n === 1 ? n : ""}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WrittenToChartPage() {
  const [instructions, setInstructions] = useState("");
  const [notes, setNotes] = useState("");
  const [chart, setChart] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    if (!instructions.trim()) return;
    setLoading(true);
    setError("");
    setChart(null);

    try {
      const res = await fetch("/api/written-to-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setChart(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!chart) return;
    const reversedGrid = [...chart.grid].reverse();
    const numRows = reversedGrid.length;
    const cellPx = 18;

    const cellsHtml = reversedGrid.map((row, di) => {
      const rowNum = numRows - di;
      const isRS = rowNum % 2 === 1;
      const cells = row.map(sym => {
        const s = getStyle(sym);
        return `<td style="width:${cellPx}px;height:${cellPx}px;background:${s.bg};border:1px solid #ccc;text-align:center;vertical-align:middle;font-size:${s.fontSize};color:${s.color};font-family:monospace;padding:0;">${s.text}</td>`;
      }).join("");
      return `<tr>
        <td style="width:22px;text-align:right;padding-right:5px;font-size:9pt;color:${isRS ? "#be123c" : "#aaa"};font-weight:${isRS ? 700 : 400};font-family:Arial;">${rowNum}</td>
        ${cells}
        <td style="width:30px;padding-left:5px;font-size:8pt;color:${isRS ? "#be123c" : "#aaa"};font-family:Arial;">${isRS ? "RS →" : "← WS"}</td>
      </tr>`;
    }).join("");

    const stNums = Array.from({ length: chart.stitches }, (_, i) => chart.stitches - i).map(n => `<td style="width:${cellPx}px;text-align:center;font-size:8pt;color:#888;font-family:Arial;">${n % 5 === 0 || n === 1 ? n : ""}</td>`).join("");

    const keyHtml = Object.entries(chart.key).map(([sym, desc]) => {
      const s = getStyle(sym);
      return `<tr><td style="width:22px;height:18px;background:${s.bg};border:1px solid #ccc;text-align:center;font-family:monospace;font-size:${s.fontSize};color:${s.color};">${s.text || (sym === "□" ? "□" : sym === "■" ? "■" : sym)}</td><td style="padding-left:8px;font-size:9pt;font-family:Georgia,serif;color:#1a1a1a;">${desc}</td></tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${chart.title} — CraftersKit</title>
<style>
  @page { margin: 2cm 2.2cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia,'Times New Roman',serif; font-size: 10.5pt; color: #1a1a1a; line-height: 1.7; }
  .masthead { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 6px; }
  h1.title { font-family: Arial,Helvetica,sans-serif; font-size: 20pt; font-weight: 900; color: #1a1a1a; line-height: 1.15; margin-bottom: 4px; }
  .subtitle { font-size: 9.5pt; color: #555; font-style: italic; }
  .brand { font-family: Arial,Helvetica,sans-serif; font-size: 7.5pt; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #be123c; white-space: nowrap; }
  .rule { border: none; border-top: 2px solid #be123c; margin: 10px 0 16px; }
  h2.sec { font-family: Arial,Helvetica,sans-serif; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: #be123c; border-bottom: 1.5px solid #be123c; padding-bottom: 2px; margin: 18px 0 10px; }
  table.chart { border-collapse: collapse; }
  .notes { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 9.5pt; font-style: italic; color: #555; }
  .notes strong { font-style: normal; font-family: Arial,Helvetica,sans-serif; }
  .footer { margin-top: 24px; padding-top: 6px; border-top: 1px solid #e0e0e0; font-size: 7pt; color: #bbb; font-family: Arial,Helvetica,sans-serif; text-align: center; }
  table.key { border-collapse: collapse; margin-top: 4px; }
</style></head><body>
<div class="masthead">
  <div>
    <h1 class="title">${chart.title}</h1>
    <p class="subtitle">${chart.stitches} stitches &times; ${chart.rows} rows &mdash; ${chart.craft}</p>
  </div>
  <div class="brand">CraftersKit.com</div>
</div>
<hr class="rule">

<h2 class="sec">Chart</h2>
<table class="chart"><tbody>
  ${cellsHtml}
  <tr><td></td>${stNums}</tr>
</tbody></table>

<h2 class="sec">Stitch Key</h2>
<table class="key"><tbody>${keyHtml}</tbody></table>

${chart.notes ? `<div class="notes"><strong>Notes:</strong> ${chart.notes}</div>` : ""}

<div class="footer">Generated by CraftersKit &mdash; crafterskit.com &mdash; AI-generated chart. Verify stitch counts before knitting.</div>
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
        <Link href="/" className="text-xl font-bold text-gray-900">CraftersKit</Link>
        <Link href="/gauge-calculator" className="text-sm text-gray-400 hover:text-[#e11d48] transition-colors font-medium">Gauge Calculator</Link>
        <Link href="/chart-converter" className="text-sm text-gray-400 hover:text-[#e11d48] transition-colors font-medium">Chart Converter</Link>
        <Link href="/photo-to-pattern" className="text-sm text-gray-400 hover:text-[#e11d48] transition-colors font-medium">Photo to Pattern</Link>
        <span className="text-sm text-[#e11d48] font-medium">Written to Chart</span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">Written to Chart</h2>
        <p className="text-gray-500 mb-6">Paste written knitting or crochet instructions and get a visual grid chart with symbols.</p>

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Paste your written instructions</label>
          <textarea
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            rows={10}
            placeholder={"Row 1 (RS): K2, *yo, k2tog, k3; rep from * to last 2 sts, k2.\nRow 2 (WS): Purl all sts.\nRow 3 (RS): K2, *k2tog, yo, k3; rep from * to last 2 sts, k2.\nRow 4 (WS): Purl all sts."}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#e11d48] font-mono"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anything to add? <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. This is a 12-stitch lace repeat worked flat"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#e11d48]"
          />
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !instructions.trim()}
          className="w-full bg-[#e11d48] hover:bg-[#be123c] disabled:bg-gray-300 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          {loading ? "Generating chart…" : "Generate Chart"}
        </button>

        {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}

        {chart && (
          <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">{chart.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{chart.stitches} sts × {chart.rows} rows — {chart.craft}</p>
              </div>
              <button
                onClick={handleDownload}
                className="text-sm bg-[#e11d48] hover:bg-[#be123c] text-white font-medium rounded-lg px-3 py-1.5 transition-colors"
              >
                Save as PDF
              </button>
            </div>

            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-5">
              AI-generated chart — always verify stitch counts against your written instructions before knitting.
            </p>

            <ChartGrid chart={chart} />

            {/* Stitch key */}
            <div className="mt-6 border-t border-gray-100 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#be123c] mb-3">Stitch Key</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                {Object.entries(chart.key).map(([sym, desc]) => {
                  const s = getStyle(sym);
                  return (
                    <div key={sym} className="flex items-center gap-2 text-sm">
                      <div style={{ width: 22, height: 22, background: s.bg, border: "1px solid #ccc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: s.fontSize, color: s.color, flexShrink: 0, fontFamily: "monospace" }}>
                        {s.text || (sym === "□" ? "□" : sym === "■" ? "■" : sym)}
                      </div>
                      <span className="text-gray-700">{desc}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {chart.notes && (
              <div className="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-500 italic">
                <strong className="font-semibold text-gray-700 not-italic">Notes:</strong> {chart.notes}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
