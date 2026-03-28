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
        className="w-7 h-7 rounded-full border-2 border-dashed border-[#e11d48]/50 text-[#e11d48] text-sm font-bold flex items-center justify-center cursor-help hover:bg-[#e11d48] hover:text-white hover:border-solid transition-all duration-200"
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
    ? "border-[#e11d48]/40 hover:border-[#e11d48] focus:border-[#e11d48]"
    : "border-gray-300 hover:border-gray-500 focus:border-gray-600";
  return (
    <div className={`bg-white border-2 border-dashed ${accent ? "border-[#e11d48]/30 hover:border-[#e11d48]/60" : "border-gray-200 hover:border-gray-400"} rounded-3xl p-7 transition-all duration-200 hover:shadow-md`}>
      <div className="flex items-start justify-between mb-1">
        <h2 className={`text-2xl font-bold ${accent ? "text-[#e11d48]" : "text-gray-800"}`}>{label}</h2>
        <InfoTip text={tip} flipLeft={accent} />
      </div>
      <p className="text-base text-gray-400 mb-5">{sublabel}</p>
      <div className="flex gap-2 mb-5">
        {(["4inch", "inch"] as const).map((u) => (
          <button key={u} onClick={() => onUnit(u)}
            className={`px-4 py-2 rounded-xl text-base font-semibold border-2 transition-all duration-200 ${unit === u ? "border-solid bg-[#e11d48] border-[#e11d48] text-white" : "border-dashed border-gray-300 text-gray-400 hover:border-[#e11d48]/40 hover:text-[#e11d48]"}`}>
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
          className={`w-40 text-5xl font-bold border-2 border-dashed ${border} focus:border-solid rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-[#e11d48]/10 transition-all duration-200 bg-white placeholder:text-gray-200 placeholder:text-3xl placeholder:font-normal`}
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
      <div className="flex-1 border-t-2 border-dashed border-[#e11d48]/20" />
      <span className="text-2xl">{emoji}</span>
      <div className="flex-1 border-t-2 border-dashed border-[#e11d48]/20" />
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
        dragging ? "border-solid border-[#e11d48] bg-[#e11d48]/10 scale-[1.01]"
          : pdfName ? "border-dashed border-[#e11d48]/40 bg-[#e11d48]/5 hover:bg-[#e11d48]/10"
          : "border-dashed border-gray-300 bg-gray-50 hover:bg-white hover:border-gray-400"
      }`}
    >
      <input type="file" accept=".pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      {pdfName ? (
        <div className="text-center pointer-events-none">
          <div className="text-4xl mb-2">📄</div>
          <p className="text-lg font-bold text-[#e11d48]">{pdfName}</p>
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

// ─── SHARED PDF BUILDER ───────────────────────────────────────────────────────
function buildPdfHtml(content: string): string {
  const inline = (s: string) =>
    s.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
     .replace(/\*(.*?)\*/g, "<em>$1</em>")
     .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}\u{2300}-\u{23FF}]/gu, "");

  const lines = content.split("\n");
  let body = "";
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (t.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      const rows = tableLines.filter(l => !/^\|[\s:\-|]+\|$/.test(l));
      body += `<table><tbody>`;
      rows.forEach((row, ri) => {
        const cells = row.split("|").slice(1, -1);
        const tag = ri === 0 ? "th" : "td";
        body += `<tr>${cells.map(c => `<${tag}>${inline(c.trim())}</${tag}>`).join("")}</tr>`;
      });
      body += `</tbody></table>`;
      continue;
    }
    if (/^# /.test(t))          body += `<h1>${inline(t.slice(2))}</h1>`;
    else if (/^## /.test(t))    body += `<h2>${inline(t.slice(3))}</h2>`;
    else if (/^### /.test(t))   body += `<h3>${inline(t.slice(4))}</h3>`;
    else if (/^-{3,}$/.test(t)) body += `<hr>`;
    else if (/^> /.test(t))     body += `<blockquote>${inline(t.slice(2))}</blockquote>`;
    else if (/^[-•\d]+[\.\)]\s/.test(t)) body += `<li>${inline(t.replace(/^[-•\d]+[\.\)]\s/, ""))}</li>`;
    else if (t === "")          body += `<div class="gap"></div>`;
    else                        body += `<p>${inline(t)}</p>`;
    i++;
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Your Adapted Pattern — CraftersKit.com</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',Georgia,sans-serif;font-size:11pt;color:#222;background:#fff;line-height:1.65}
  .header{background:#e11d48;color:#fff;padding:13px 48px;display:flex;justify-content:space-between;align-items:center}
  .header .brand{font-weight:700;font-size:15pt;letter-spacing:-0.3px}
  .header .sub{font-size:10pt;opacity:.88}
  .wrap{max-width:680px;margin:0 auto;padding:36px 48px 60px}
  h1{font-family:'Playfair Display',Georgia,serif;font-size:22pt;color:#e11d48;font-weight:700;margin:28px 0 6px;line-height:1.25}
  h2{font-family:'Inter',sans-serif;font-size:13pt;color:#111;font-weight:600;margin:26px 0 8px;padding-bottom:5px;border-bottom:1.5px solid #ebebeb}
  h3{font-family:'Inter',sans-serif;font-size:11.5pt;color:#333;font-weight:600;margin:18px 0 5px}
  p{margin:6px 0 10px}
  .gap{height:8px}
  table{width:100%;border-collapse:collapse;margin:14px 0;font-size:10.5pt}
  th{background:#e11d48;color:#fff;padding:8px 14px;text-align:left;font-weight:600;font-size:10pt}
  td{padding:7px 14px;border-bottom:1px solid #eee}
  tr:nth-child(even) td{background:#faf7f5}
  td:first-child{color:#e11d48;font-weight:500}
  blockquote{background:#faf7f5;border-left:3px solid #e11d48;padding:9px 16px;margin:10px 0;color:#555;font-style:italic;font-size:10.5pt}
  li{margin:3px 0 3px 22px;list-style:disc}
  hr{border:none;border-top:1px solid #e5e5e5;margin:18px 0}
  strong{color:#111;font-weight:600}
  .footer{text-align:center;color:#bbb;font-size:8.5pt;margin-top:48px;padding-top:14px;border-top:1px solid #eee}
  @media print{
    .header{print-color-adjust:exact;-webkit-print-color-adjust:exact}
    .wrap{padding-top:24px}
    table{print-color-adjust:exact;-webkit-print-color-adjust:exact;page-break-inside:avoid}
    th{print-color-adjust:exact;-webkit-print-color-adjust:exact}
    h1,h2{page-break-after:avoid}
    @page{margin:.5in .65in .75in}
  }
</style></head><body>
<div class="header"><span class="brand">CraftersKit.com</span><span class="sub">Your Adapted Pattern</span></div>
<div class="wrap">${body}
<div class="footer">© CraftersKit.com &nbsp;•&nbsp; crafterskit.com &nbsp;•&nbsp; Made with love for a fellow maker</div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`;
}

// ─── MARKDOWN RENDERER ────────────────────────────────────────────────────────
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/);
  return parts.map((part, j) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={j} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={j}>{part.slice(1, -1)}</em>;
    return part;
  });
}

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const t = lines[i].trim();
    if (t.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) { tableLines.push(lines[i].trim()); i++; }
      const rows = tableLines.filter(l => !/^\|[\s:\-|]+\|$/.test(l));
      elements.push(
        <table key={i} className="w-full border-collapse my-5 text-sm rounded-xl overflow-hidden">
          <tbody>
            {rows.map((row, ri) => {
              const cells = row.split("|").slice(1, -1);
              return (
                <tr key={ri} className={ri % 2 === 1 ? "bg-[#faf7f5]" : ""}>
                  {cells.map((cell, ci) => ri === 0
                    ? <th key={ci} className="bg-[#e11d48] text-white px-4 py-3 text-left font-semibold">{renderInline(cell.trim())}</th>
                    : <td key={ci} className={`px-4 py-2.5 border-b border-gray-100 ${ci === 0 ? "font-semibold text-[#e11d48]" : "text-gray-700"}`}>{renderInline(cell.trim())}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      );
      continue;
    }
    if (/^# /.test(t))          elements.push(<h1 key={i} className="text-2xl font-bold text-[#e11d48] mt-6 mb-2 leading-snug">{renderInline(t.slice(2))}</h1>);
    else if (/^## /.test(t))    elements.push(<h2 key={i} className="text-lg font-bold text-gray-900 mt-5 mb-2 pb-1 border-b border-gray-200">{renderInline(t.slice(3))}</h2>);
    else if (/^### /.test(t))   elements.push(<h3 key={i} className="text-base font-bold text-gray-800 mt-4 mb-1">{renderInline(t.slice(4))}</h3>);
    else if (/^-{3,}$/.test(t)) elements.push(<hr key={i} className="my-4 border-gray-200" />);
    else if (/^> /.test(t))     elements.push(<blockquote key={i} className="bg-[#faf7f5] border-l-4 border-[#e11d48] px-4 py-2 my-3 text-gray-600 italic text-sm rounded-r-lg">{renderInline(t.slice(2))}</blockquote>);
    else if (/^[-•]\s/.test(t)) elements.push(<li key={i} className="ml-5 my-1 list-disc text-gray-700 text-base leading-relaxed">{renderInline(t.replace(/^[-•]\s/, ""))}</li>);
    else if (t === "")          elements.push(<div key={i} className="h-2" />);
    else                        elements.push(<p key={i} className="text-gray-700 text-base leading-relaxed my-1.5">{renderInline(t)}</p>);
    i++;
  }
  return <div>{elements}</div>;
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
  const [downloaded, setDownloaded] = useState(false);
  const [err, setErr] = useState("");

  function downloadPdf() {
    const win = window.open("", "_blank");
    if (win) { win.document.write(buildPdfHtml(output)); win.document.close(); }
    else { setErr("Please allow pop-ups for this site to download your pattern."); }
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  }

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
    finally {
      setRunning(false);
      // Warn if response looks truncated (ends mid-sentence)
      setOutput((prev) => {
        const trimmed = prev.trimEnd();
        const lastChar = trimmed.slice(-1);
        if (trimmed.length > 100 && !".!?)\"'".includes(lastChar)) {
          return prev + "\n\n⚠️ This response may have been cut short. Try clicking Rewrite My Pattern again — the pattern is complex and occasionally hits a length limit.";
        }
        return prev;
      });
    }
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
            className={`px-5 py-2.5 rounded-xl text-base font-bold border-2 transition-all duration-200 ${inputMode === "paste" ? "bg-[#e11d48] border-[#e11d48] text-white" : "border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600"}`}>
            Paste text
          </button>
          <button onClick={() => setInputMode("pdf")}
            className={`px-5 py-2.5 rounded-xl text-base font-bold border-2 transition-all duration-200 ${inputMode === "pdf" ? "bg-[#e11d48] border-[#e11d48] text-white" : "border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600"}`}>
            Upload PDF
          </button>
        </div>

        {inputMode === "paste" ? (
          <textarea
            value={patternText}
            onChange={(e) => setPatternText(e.target.value)}
            rows={10}
            placeholder={"Paste the instructions here — for example:\n\nCast on 140 sts. Join in the round.\nKnit one round placing markers every 28 sts.\nWork chart repeats as desired.\nBind off all sts."}
            className="w-full border-2 border-dashed border-gray-200 hover:border-gray-300 focus:border-[#e11d48] focus:border-solid focus:ring-4 focus:ring-[#e11d48]/10 rounded-2xl px-5 py-4 text-lg font-mono focus:outline-none resize-y transition-all duration-200 leading-relaxed"
          />
        ) : pdfLoading ? (
          <div className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-[#e11d48]/30 rounded-2xl bg-[#e11d48]/5">
            <div className="text-4xl mb-2 animate-pulse">📖</div>
            <p className="text-lg font-bold text-[#e11d48]">Reading your pattern…</p>
            <p className="text-base text-gray-400 mt-1">Just a moment!</p>
          </div>
        ) : (
          <PdfDropZone pdfName={pdfName} onFile={handlePdfFile} />
        )}
      </div>

      {/* Box 2 — Describe situation */}
      <div className="bg-white border-2 border-dashed border-[#e11d48]/30 rounded-3xl p-8 hover:border-[#e11d48]/60 hover:shadow-md transition-all duration-200">
        <h2 className="text-3xl font-bold text-[#e11d48] mb-2">Step 2 — Let us know how you&apos;re looking to change the pattern</h2>
        <p className="text-lg text-gray-400 mb-6">
          You can just type in normal language and our AI calculator will figure it out.
        </p>
        <textarea
          value={situation}
          onChange={(e) => setSituation(e.target.value)}
          rows={5}
          placeholder={"Examples of what you might write:\n\n\"My yarn does 16 stitches per 4 inches. The pattern calls for 22.\"\n\n\"I'm using a much thicker yarn — Lion Brand Wool-Ease Thick & Quick on size 13 needles. My swatch came out to 12 stitches per 4 inches.\"\n\n\"I want to make the medium size but I knit very loosely so my gauge is always bigger than the pattern.\""}
          className="w-full border-2 border-dashed border-[#e11d48]/20 hover:border-[#e11d48]/40 focus:border-[#e11d48] focus:border-solid focus:ring-4 focus:ring-[#e11d48]/10 rounded-2xl px-5 py-4 text-lg focus:outline-none resize-y transition-all duration-200 leading-relaxed"
        />
      </div>

      {/* Button */}
      <button
        onClick={handleRun}
        disabled={!ready || running}
        className="w-full py-6 bg-[#e11d48] text-white text-2xl font-bold rounded-3xl hover:bg-[#be123c] hover:scale-[1.01] cursor-pointer transition-all duration-200 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:scale-100 shadow-lg"
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
                <span className="flex items-center gap-2 text-base text-[#e11d48] font-semibold">
                  <span className="w-2 h-2 bg-[#e11d48] rounded-full animate-pulse" />Writing…
                </span>
              )}
            </div>
            {output && !running && (
              <div className="flex gap-3">
                <button
                  onClick={async () => { await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="text-lg font-bold text-gray-600 hover:text-[#e11d48] border-2 border-dashed border-gray-300 hover:border-[#e11d48] rounded-xl px-5 py-2.5 transition-all duration-200 hover:scale-105"
                >
                  {copied ? "Copied! ✓" : "Copy to clipboard"}
                </button>
                <button
                  onClick={downloadPdf}
                  className="text-lg font-bold text-white bg-[#e11d48] hover:bg-[#be123c] border-2 border-[#e11d48] rounded-xl px-5 py-2.5 transition-all duration-200 hover:scale-105 cursor-pointer"
                >
                  {downloaded ? "Downloaded! ✓" : "⬇ Download My Pattern"}
                </button>
              </div>
            )}
          </div>
          <div className="p-8">
            {running ? (
              <pre className="text-base text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                {output}
                <span className="inline-block w-0.5 h-5 bg-[#e11d48] animate-pulse ml-1 align-middle" />
              </pre>
            ) : (
              <MarkdownRenderer content={output} />
            )}
          </div>
        </div>
      )}
      <p className="text-xs text-gray-400 text-center pt-2 pb-4 leading-relaxed">
        AI-generated pattern adaptations are provided as a starting point and may contain errors. Always cross-reference with your original pattern and knit a gauge swatch before beginning your project.
      </p>
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
  const newYardsStitchOnly = hasScale && !isNaN(origYardsNum) && origYardsNum > 0
    ? Math.round(origYardsNum * stitchScale!) : null;
  const yardDiff = newYards !== null ? Math.round(newYards - origYardsNum) : null;
  const skeinsNum = yardUnit === "m"
    ? parseFloat(skeinsYards) * 1.09361
    : parseFloat(skeinsYards);
  const skeinsNeeded = newYards && !isNaN(skeinsNum) && skeinsNum > 0
    ? Math.ceil(newYards / skeinsNum) : null;
  const multiList = customSts
    .split(/[,\s]+/)
    .map(s => s.trim())
    .filter(s => /^\d+$/.test(s) && parseInt(s) > 0)
    .map(s => parseInt(s));
  const multiConverted = stitchScale
    ? multiList.map(n => ({ orig: n, converted: Math.round(n * stitchScale!) }))
    : [];
  const pctChange = stitchScale ? ((stitchScale - 1) * 100) : 0;
  const tighter = stitchScale !== null && stitchScale > 1;

  const [calcCopied, setCalcCopied] = useState(false);
  const [calcDownloaded, setCalcDownloaded] = useState(false);
  const [calcErr, setCalcErr] = useState("");

  const calcReport = (() => {
    if (!hasScale) return "";
    const lines: string[] = [];
    lines.push("# Your Gauge Summary");
    lines.push("");
    lines.push("## Numbers at a Glance");
    lines.push("");
    const patGauge = `${patSts} sts ${patUnit === "4inch" ? "per 4 in" : "per in"}`;
    const yourGauge = `${yourSts} sts ${yourUnit === "4inch" ? "per 4 in" : "per in"}`;
    const tableRows: string[][] = [["", "Pattern", "Yours"], ["Stitch gauge", patGauge, yourGauge]];
    if (patRows && yourRows) {
      tableRows.push(["Row gauge", `${patRows} rows ${patRowUnit === "4inch" ? "per 4 in" : "per in"}`, `${yourRows} rows ${yourRowUnit === "4inch" ? "per 4 in" : "per in"}`]);
    }
    if (newYards !== null && origYardsNum > 0) {
      const od = yardUnit === "m" ? `${parseFloat(origYards).toLocaleString()} m` : `${Math.round(origYardsNum).toLocaleString()} yds`;
      const nd = yardUnit === "m" ? `${Math.round(newYards / 1.09361).toLocaleString()} m` : `${Math.round(newYards).toLocaleString()} yds`;
      tableRows.push(["Yardage needed", od, nd]);
    }
    if (skeinsNeeded !== null) {
      tableRows.push(["Skeins to buy", "—", `${skeinsNeeded} ${skeinsNeeded === 1 ? "skein" : "skeins"}`]);
    }
    tableRows.forEach((row, ri) => {
      lines.push("| " + row.join(" | ") + " |");
      if (ri === 0) lines.push("|---|---|---|");
    });
    lines.push("");
    if (perfect) {
      lines.push("**Perfect gauge match** — no adjustments needed.");
    } else {
      lines.push(`**Scale factor: ${stitchScale!.toFixed(3)}** — your gauge is ${Math.abs(pctChange).toFixed(0)}% ${tighter ? "tighter" : "looser"} than the pattern.`);
      if (rowScale !== null && rowScale !== stitchScale) {
        lines.push(`Row scale factor: ${rowScale.toFixed(3)}`);
      }
      if (yardDiff !== null && Math.abs(yardDiff) > 5) {
        const diffDisplay = yardUnit === "m"
          ? `${Math.abs(Math.round(yardDiff / 1.09361))} m`
          : `${Math.abs(yardDiff)} yds`;
        lines.push(yardDiff > 0
          ? `You will need **${diffDisplay} more** yarn than the pattern calls for.`
          : `You will need **${diffDisplay} less** yarn than the pattern calls for.`);
      }
      if (newYardsStitchOnly !== null && newYards !== null && Math.abs(newYardsStitchOnly - Math.round(newYards)) > 5) {
        const stitchOnlyDisplay = yardUnit === "m"
          ? `${Math.round(newYardsStitchOnly / 1.09361)} m`
          : `${newYardsStitchOnly} yds`;
        lines.push(`For shawls or scarves worked to a measurement (not a fixed row count), actual yardage is closer to **${stitchOnlyDisplay}**.`);
      }
    }
    if (multiConverted.length > 0) {
      lines.push("");
      lines.push("## Stitch Conversions");
      multiConverted.forEach(({ orig, converted }) => {
        lines.push(`- Pattern: **${orig} sts** → You use: **${converted} sts**`);
      });
    }
    return lines.join("\n");
  })();

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
            <span className={`text-5xl font-bold ${tighter ? "text-[#e11d48]" : "text-emerald-600"}`}>
              {Math.abs(pctChange).toFixed(0)}% {tighter ? "tighter" : "looser"}
            </span>
            <span className="text-2xl text-gray-500">
              {tighter ? "— you'll use more stitches per row to get the same size." : "— you'll use fewer stitches per row to get the same size."}
            </span>
          </div>
        )
      )}

      {/* Row gauge — now above yardage so it affects the yardage calculation visibly */}
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
                        className={`px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${unit === u ? "border-solid bg-[#e11d48] border-[#e11d48] text-white" : "border-dashed border-gray-300 text-gray-400 hover:border-[#e11d48]/40"}`}>
                        {u === "4inch" ? "per 4 in" : "per inch"}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="number" min="0" step="0.5" placeholder="e.g. 28" value={val}
                      onChange={(e) => set(e.target.value)} onWheel={(e) => e.currentTarget.blur()} onKeyDown={blockLetters}
                      className="w-32 text-3xl font-bold border-2 border-dashed border-gray-300 hover:border-[#e11d48]/50 focus:border-[#e11d48] focus:border-solid rounded-xl px-4 py-3 focus:outline-none transition-all duration-200 bg-white placeholder:text-gray-200 placeholder:font-normal" />
                    <span className="text-base text-gray-400">rows {unit === "4inch" ? "per 4 in" : "per in"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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
                  className={`px-4 py-1.5 rounded-lg text-base font-bold transition-all duration-200 ${yardUnit === u ? "bg-white text-[#e11d48] shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
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
                  className="w-44 text-4xl font-bold border-2 border-dashed border-gray-300 hover:border-[#e11d48]/50 focus:border-[#e11d48] focus:border-solid focus:ring-4 focus:ring-[#e11d48]/10 rounded-2xl px-5 py-4 focus:outline-none transition-all duration-200 bg-white placeholder:text-gray-200 placeholder:font-normal placeholder:text-2xl" />
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
                  className="w-44 text-4xl font-bold border-2 border-dashed border-gray-300 hover:border-[#e11d48]/50 focus:border-[#e11d48] focus:border-solid focus:ring-4 focus:ring-[#e11d48]/10 rounded-2xl px-5 py-4 focus:outline-none transition-all duration-200 bg-white placeholder:text-gray-200 placeholder:font-normal placeholder:text-2xl" />
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
                <span className={`text-base font-semibold ${yardDiff > 0 ? "text-[#e11d48]" : "text-emerald-600"}`}>
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

      <Divider emoji="📐" />

      {/* Stitch converter — multi-count */}
      <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-8 hover:border-gray-300 hover:shadow-md transition-all duration-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-1 flex items-center">
          Convert stitch counts from your pattern
          <InfoTip text="Enter any stitch counts from your pattern — separated by commas. For example: 120, 84, 60. We'll show you what each becomes with your yarn." />
        </h2>
        <p className="text-lg text-gray-400 mb-6">Enter the numbers from your pattern, separated by commas — we&apos;ll convert all of them at once.</p>
        <input
          type="text"
          placeholder={hasScale ? "e.g. 120, 84, 60, 24" : "Enter both gauges above first"}
          value={customSts}
          disabled={!hasScale}
          onChange={(e) => setCustomSts(e.target.value)}
          className="w-full text-xl border-2 border-dashed border-gray-300 hover:border-[#e11d48]/50 focus:border-[#e11d48] focus:border-solid focus:ring-4 focus:ring-[#e11d48]/10 rounded-2xl px-5 py-4 focus:outline-none transition-all duration-200 bg-white placeholder:text-gray-300 disabled:bg-gray-50 disabled:cursor-not-allowed"
        />
        {multiConverted.length > 0 && (
          <div className="mt-6 border-t-2 border-dashed border-gray-100 pt-6">
            <div className="grid gap-3">
              {multiConverted.map(({ orig, converted }, i) => (
                <div key={i} className="flex items-center gap-4 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-xl text-gray-500 w-32 text-right font-mono">{orig} sts</span>
                  <span className="text-2xl text-gray-200">→</span>
                  <span className="text-2xl font-bold text-[#e11d48] w-32 font-mono">{converted} sts</span>
                  {orig !== converted && (
                    <span className={`text-sm font-semibold ${converted > orig ? "text-rose-500" : "text-emerald-600"}`}>
                      {converted > orig ? `+${converted - orig}` : `${converted - orig}`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Gauge Report — appears once hasScale is ready */}
      {calcReport && (
        <>
          <Divider emoji="📋" />
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl overflow-hidden hover:border-gray-300 transition-all duration-200">
            <div className="flex items-center justify-between px-8 py-5 border-b-2 border-dashed border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Your Gauge Report</h2>
              <div className="flex gap-3">
                <button
                  onClick={async () => { await navigator.clipboard.writeText(calcReport); setCalcCopied(true); setTimeout(() => setCalcCopied(false), 2000); }}
                  className="text-lg font-bold text-gray-600 hover:text-[#e11d48] border-2 border-dashed border-gray-300 hover:border-[#e11d48] rounded-xl px-5 py-2.5 transition-all duration-200 hover:scale-105"
                >
                  {calcCopied ? "Copied! ✓" : "Copy to clipboard"}
                </button>
                <button
                  onClick={() => {
                    const win = window.open("", "_blank");
                    if (win) { win.document.write(buildPdfHtml(calcReport)); win.document.close(); }
                    else { setCalcErr("Please allow pop-ups for this site to download your report."); }
                    setCalcDownloaded(true);
                    setTimeout(() => setCalcDownloaded(false), 2000);
                  }}
                  className="text-lg font-bold text-white bg-[#e11d48] hover:bg-[#be123c] border-2 border-[#e11d48] rounded-xl px-5 py-2.5 transition-all duration-200 hover:scale-105 cursor-pointer"
                >
                  {calcDownloaded ? "Downloaded! ✓" : "⬇ Download My Report"}
                </button>
              </div>
            </div>
            {calcErr && <p className="text-base text-red-500 px-8 pt-4">{calcErr}</p>}
            <div className="p-8 space-y-6">
              {/* Numbers table */}
              <table className="w-full border-collapse text-base rounded-xl overflow-hidden">
                <thead>
                  <tr>
                    <th className="bg-[#e11d48] text-white px-5 py-3 text-left font-semibold w-1/3" />
                    <th className="bg-[#e11d48] text-white px-5 py-3 text-left font-semibold">Pattern</th>
                    <th className="bg-[#e11d48] text-white px-5 py-3 text-left font-semibold">Yours</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="px-5 py-3 font-semibold text-[#e11d48] text-sm uppercase tracking-wide">Stitch gauge</td>
                    <td className="px-5 py-3 text-gray-700">{patSts} sts {patUnit === "4inch" ? "per 4 in" : "per in"}</td>
                    <td className="px-5 py-3 text-gray-700">{yourSts} sts {yourUnit === "4inch" ? "per 4 in" : "per in"}</td>
                  </tr>
                  {patRows && yourRows && (
                    <tr className="bg-[#faf7f5] border-b border-gray-100">
                      <td className="px-5 py-3 font-semibold text-[#e11d48] text-sm uppercase tracking-wide">Row gauge</td>
                      <td className="px-5 py-3 text-gray-700">{patRows} rows {patRowUnit === "4inch" ? "per 4 in" : "per in"}</td>
                      <td className="px-5 py-3 text-gray-700">{yourRows} rows {yourRowUnit === "4inch" ? "per 4 in" : "per in"}</td>
                    </tr>
                  )}
                  {newYards !== null && origYardsNum > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="px-5 py-3 font-semibold text-[#e11d48] text-sm uppercase tracking-wide">Yardage needed</td>
                      <td className="px-5 py-3 text-gray-700">
                        {yardUnit === "m" ? `${parseFloat(origYards).toLocaleString()} m` : `${Math.round(origYardsNum).toLocaleString()} yds`}
                      </td>
                      <td className="px-5 py-3 text-gray-700">
                        {yardUnit === "m" ? `${Math.round(newYards / 1.09361).toLocaleString()} m` : `${Math.round(newYards).toLocaleString()} yds`}
                      </td>
                    </tr>
                  )}
                  {skeinsNeeded !== null && (
                    <tr className="bg-[#faf7f5]">
                      <td className="px-5 py-3 font-semibold text-[#e11d48] text-sm uppercase tracking-wide">Skeins to buy</td>
                      <td className="px-5 py-3 text-gray-400">—</td>
                      <td className="px-5 py-3">
                        <span className="text-2xl font-bold text-emerald-600">{skeinsNeeded}</span>
                        <span className="text-base text-gray-500 ml-1">{skeinsNeeded === 1 ? "skein" : "skeins"}</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Scale summary */}
              <div className={`rounded-2xl px-6 py-4 border ${perfect ? "bg-emerald-50 border-emerald-100" : tighter ? "bg-rose-50 border-rose-100" : "bg-emerald-50 border-emerald-100"}`}>
                {perfect ? (
                  <p className="text-lg font-bold text-emerald-700">Perfect gauge match — no adjustments needed.</p>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-base text-gray-800">
                      <span className="font-bold">Scale factor: {stitchScale!.toFixed(3)}</span>
                      {" — "}your gauge is{" "}
                      <span className={`font-bold ${tighter ? "text-[#e11d48]" : "text-emerald-600"}`}>
                        {Math.abs(pctChange).toFixed(0)}% {tighter ? "tighter" : "looser"}
                      </span>
                      {" "}than the pattern.
                    </p>
                    {rowScale !== null && rowScale !== stitchScale && (
                      <p className="text-sm text-gray-500">Row scale factor: {rowScale.toFixed(3)}</p>
                    )}
                    {yardDiff !== null && Math.abs(yardDiff) > 5 && (
                      <p className="text-base text-gray-700">
                        You will need{" "}
                        <span className={`font-bold ${yardDiff > 0 ? "text-[#e11d48]" : "text-emerald-600"}`}>
                          {yardUnit === "m"
                            ? `${Math.abs(Math.round(yardDiff / 1.09361))} m`
                            : `${Math.abs(yardDiff)} yds`}
                          {" "}{yardDiff > 0 ? "more" : "less"}
                        </span>
                        {" "}yarn than the pattern calls for.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Stitch conversions */}
              {multiConverted.length > 0 && (
                <div className="border-t-2 border-dashed border-gray-100 pt-4">
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Stitch Conversions</p>
                  <div className="grid gap-2">
                    {multiConverted.map(({ orig, converted }, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-base text-gray-600 w-24 text-right font-mono">{orig} sts</span>
                        <span className="text-gray-300">→</span>
                        <span className="text-base font-bold text-[#e11d48] font-mono">{converted} sts</span>
                        {orig !== converted && (
                          <span className={`text-xs font-semibold ${converted > orig ? "text-rose-500" : "text-emerald-600"}`}>
                            {converted > orig ? `+${converted - orig}` : `${converted - orig}`}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <p className="text-xs text-gray-400 text-center leading-relaxed">
        Calculations are based on the gauge values you provide and standard knitting math. Results are estimates — always knit a gauge swatch and verify stitch counts against your original pattern before casting on.
      </p>
      <div className="h-4" />
    </div>
  );
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────
export default function GaugeCalculator({ username }: { username: string }) {
  const [mode, setMode] = useState<"ai" | "calc">("ai");

  return (
    <div className="min-h-screen" style={{ background: "#f7f3ee" }}>
      <header className="bg-white border-b-2 border-dashed border-[#e11d48]/20 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-bold text-gray-900 hover:text-[#e11d48] transition-colors">CraftersKit</Link>
          <span className="text-[#e11d48]/30 text-xl font-bold">- - -</span>
          <span className="text-lg font-bold text-[#e11d48]">Gauge Calculator</span>
        </div>
        {username && (
          <div className="flex items-center gap-4">
            <span className="text-base text-gray-400">@{username}</span>
            <a href="/api/auth/signout" className="text-base text-gray-400 hover:text-[#e11d48] transition-colors">Sign out</a>
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
                  ? "bg-[#e11d48] text-white shadow-md"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              ✨ AI
            </button>
            <button
              onClick={() => setMode("calc")}
              className={`px-10 py-4 rounded-xl text-2xl font-bold transition-all duration-200 ${
                mode === "calc"
                  ? "bg-[#e11d48] text-white shadow-md"
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
