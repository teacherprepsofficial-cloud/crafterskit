"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";

export default function PhotoToPatternPage() {
  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [preview, setPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  function loadFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      const img = new Image();
      img.onload = () => {
        const MAX = 1600;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const resized = canvas.toDataURL("image/jpeg", 0.92);
        setImage(resized.split(",")[1]);
        setMimeType("image/jpeg");
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    setOutput("");
    setError("");
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) loadFile(f);
  }

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) setDragging(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) loadFile(f);
  }, []);

  async function handleGenerate() {
    if (!image) return;
    setLoading(true);
    setError("");
    setOutput("");

    try {
      const res = await fetch("/api/photo-to-pattern", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, mimeType, notes }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setOutput((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(output);
  }

  function handleDownload() {
    const lines = output.split("\n");

    const sections: Record<string, string[]> = { about: [], canSee: [], gauge: [], sizing: [], instructions: [], notes: [] };
    let current = "about";
    for (const line of lines) {
      if (line.startsWith("## About")) { current = "about"; continue; }
      if (line.startsWith("## What I Can See")) { current = "canSee"; continue; }
      if (line.startsWith("## Gauge")) { current = "gauge"; continue; }
      if (line.startsWith("## Sizing")) { current = "sizing"; continue; }
      if (line.startsWith("## Pattern Instructions")) { current = "instructions"; continue; }
      if (line.startsWith("## Notes")) { current = "notes"; continue; }
      sections[current]?.push(line);
    }

    function inlineBold(s: string): string {
      return s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    }

    function isTableRow(l: string) { return l.trim().startsWith("|") && l.trim().endsWith("|"); }
    function isSeparator(l: string) { return /^\|[-| :]+\|$/.test(l.trim()); }

    function processLinesForPdf(arr: string[]): string {
      const out: string[] = [];
      let i = 0;
      while (i < arr.length) {
        const line = arr[i];
        if (isTableRow(line)) {
          const tableLines: string[] = [];
          while (i < arr.length && isTableRow(arr[i])) { tableLines.push(arr[i]); i++; }
          const dataRows = tableLines.filter(l => !isSeparator(l));
          let tbl = '<table class="md-table">';
          dataRows.forEach((row, ri) => {
            const cells = row.split("|").slice(1, -1);
            const tag = ri === 0 ? "th" : "td";
            tbl += "<tr>" + cells.map(c => `<${tag}>${inlineBold(c.trim())}</${tag}>`).join("") + "</tr>";
          });
          tbl += "</table>";
          out.push(tbl);
        } else if (line === "") {
          out.push("");
          i++;
        } else if (line.startsWith("- ")) {
          out.push(`<li>${inlineBold(line.slice(2))}</li>`);
          i++;
        } else if (/^\*\*/.test(line)) {
          const m = line.match(/^\*\*([^*]+)\*\*:?\s*(.*)/);
          if (m) {
            const isInstr = /^(Row|Round|Rnd|Section|Setup|Abbreviations|Cast|Bind|Finishing|Thumb|Cuff|Hand|Body|Sleeve|Neck|Hem|Rib)/.test(m[1]);
            out.push(`<p class="${isInstr ? "instr-head" : ""}"><strong>${m[1]}:</strong> ${inlineBold(m[2])}</p>`);
          } else {
            out.push(`<p>${inlineBold(line)}</p>`);
          }
          i++;
        } else {
          out.push(`<p>${inlineBold(line)}</p>`);
          i++;
        }
      }
      return out.join("\n");
    }

    const aboutText = sections.about.filter(Boolean).join(" ");
    const canSeeHtml = processLinesForPdf(sections.canSee);
    const gaugeHtml = processLinesForPdf(sections.gauge);
    const sizingHtml = processLinesForPdf(sections.sizing);
    const instrHtml = processLinesForPdf(sections.instructions);
    const notesHtml = sections.notes.filter(Boolean).map(l => `<p>${inlineBold(l)}</p>`).join("\n");

    const imgTag = preview ? `<img src="${preview}" style="max-height:200px;max-width:200px;border-radius:8px;border:1px solid #e5e5e5;object-fit:contain;" alt="Garment" />` : "";

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Generated Pattern — CraftersKit</title>
<style>
  @page { margin: 1.8cm 2cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 10.5pt; color: #1a1a1a; line-height: 1.65; }
  .masthead { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #be123c; padding-bottom: 10px; margin-bottom: 16px; gap: 20px; }
  .masthead-left { flex: 1; }
  .masthead-left h1 { font-family: Georgia, serif; font-size: 18pt; font-weight: bold; color: #1a1a1a; }
  .masthead-left p { font-size: 9.5pt; color: #444; margin-top: 4px; font-style: italic; }
  .brand { font-size: 8.5pt; color: #be123c; font-family: Arial, sans-serif; letter-spacing: 0.06em; text-transform: uppercase; font-weight: bold; white-space: nowrap; }
  .photo-col { flex-shrink: 0; }
  h2.section { font-family: Arial, sans-serif; font-size: 10pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #be123c; border-bottom: 1px solid #f0d0d0; padding-bottom: 4px; margin: 16px 0 8px; }
  .detail-box { background: #fdf8f8; border: 1px solid #f0d0d0; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; }
  .detail-box li { font-size: 9.5pt; list-style: disc; margin-left: 16px; padding: 2px 0; }
  .detail-box p { font-size: 9.5pt; padding: 2px 0; }
  .detail-box strong { color: #be123c; }
  .two-col { display: flex; gap: 16px; margin-bottom: 14px; }
  .two-col > div { flex: 1; }
  .instr-section { margin-bottom: 6px; }
  p { margin: 2px 0; font-size: 10pt; }
  p.instr-head { margin-top: 8px; }
  p.instr-head strong { color: #be123c; }
  li { margin: 1px 0; }
  strong { }
  .notes { background: #fafafa; border: 1px solid #e5e5e5; border-radius: 5px; padding: 10px 14px; margin-top: 16px; font-size: 9.5pt; font-style: italic; color: #444; }
  .notes h2 { font-style: normal; font-family: Arial, sans-serif; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.07em; color: #be123c; margin-bottom: 6px; }
  .disclaimer { background: #fffbf0; border: 1px solid #fde68a; border-radius: 5px; padding: 8px 12px; margin-top: 12px; font-size: 8.5pt; color: #78350f; font-style: italic; }
  .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #e5e5e5; font-size: 7.5pt; color: #aaa; font-family: Arial, sans-serif; text-align: center; }
  .md-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 4px 0; }
  .md-table th { background: #be123c; color: #fff; font-family: Arial, sans-serif; font-size: 9pt; font-weight: 700; text-align: left; padding: 5px 8px; }
  .md-table td { padding: 4px 8px; border-bottom: 1px solid #f0d0d0; vertical-align: top; }
  .md-table tr:nth-child(even) td { background: #fdf8f8; }
</style>
</head>
<body>
<div class="masthead">
  <div class="masthead-left">
    <h1>Generated Knitting Pattern</h1>
    <p>${aboutText}</p>
  </div>
  ${imgTag ? `<div class="photo-col">${imgTag}</div>` : ""}
  <div class="brand">CraftersKit.com</div>
</div>

<div class="disclaimer">
  This pattern was AI-generated from a photo. Stitch counts, gauge, and shaping are estimates — always swatch and adjust as needed before starting your project.
</div>

${canSeeHtml ? `<h2 class="section">What I Can See</h2><div class="detail-box">${canSeeHtml}</div>` : ""}

<div class="two-col">
  ${gaugeHtml ? `<div><h2 class="section">Gauge &amp; Materials</h2><div class="detail-box">${gaugeHtml}</div></div>` : ""}
  ${sizingHtml ? `<div><h2 class="section">Sizing</h2><div class="detail-box">${sizingHtml}</div></div>` : ""}
</div>

<h2 class="section">Pattern Instructions</h2>
<div class="instr-section">${instrHtml}</div>

${notesHtml ? `<div class="notes"><h2>Notes</h2>${notesHtml}</div>` : ""}

<div class="footer">Generated by CraftersKit &mdash; crafterskit.com &mdash; AI-generated pattern. Always swatch and adjust stitch counts to match your gauge before beginning.</div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  }

  function applyInlineBold(text: string, baseClass = "text-gray-800") {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1 ? <strong key={i} className="font-semibold text-gray-900">{part}</strong> : <span key={i} className={baseClass}>{part}</span>
    );
  }

  function renderOutput(text: string) {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      // Markdown table
      if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
          tableLines.push(lines[i]); i++;
        }
        const dataRows = tableLines.filter(l => !/^\|[-| :]+\|$/.test(l.trim()));
        elements.push(
          <div key={i} className="overflow-x-auto my-3">
            <table className="w-full text-sm border-collapse">
              <tbody>
                {dataRows.map((row, ri) => {
                  const cells = row.split("|").slice(1, -1);
                  return (
                    <tr key={ri} className={ri === 0 ? "bg-[#be123c] text-white" : ri % 2 === 0 ? "bg-white" : "bg-rose-50"}>
                      {cells.map((cell, ci) => ri === 0
                        ? <th key={ci} className="text-left px-3 py-1.5 font-semibold text-xs uppercase tracking-wide">{cell.trim()}</th>
                        : <td key={ci} className="px-3 py-1.5 border-b border-rose-100">{applyInlineBold(cell.trim())}</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
      if (line.startsWith("## ")) { elements.push(<h2 key={i} className="text-xl font-bold text-gray-900 mt-6 mb-2">{line.slice(3)}</h2>); i++; continue; }
      if (/^\*\*/.test(line)) {
        const m = line.match(/^\*\*([^*]+)\*\*:?\s*(.*)/);
        if (m) { elements.push(<p key={i} className="mt-1"><span className="font-semibold text-gray-900">{m[1]}:</span> <span className="text-gray-800"> {applyInlineBold(m[2])}</span></p>); i++; continue; }
      }
      if (line.startsWith("- ")) { elements.push(<li key={i} className="ml-4 text-gray-800 list-disc">{applyInlineBold(line.slice(2))}</li>); i++; continue; }
      if (line === "") { elements.push(<div key={i} className="h-2" />); i++; continue; }
      elements.push(<p key={i} className="text-gray-800">{applyInlineBold(line)}</p>);
      i++;
    }
    return elements;
  }

  return (
    <div
      className="min-h-screen bg-gray-50 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {dragging && (
        <div className="fixed inset-0 z-50 bg-[#e11d48]/10 border-4 border-dashed border-[#e11d48] flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-2xl px-10 py-8 shadow-xl flex flex-col items-center gap-3">
            <p className="text-lg font-semibold text-gray-800">Drop your garment photo here</p>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
        <Link href="/" className="text-xl font-bold text-gray-900">CraftersKit</Link>
        <Link href="/gauge-calculator" className="text-sm text-gray-400 hover:text-[#e11d48] transition-colors font-medium">Gauge Calculator</Link>
        <Link href="/chart-converter" className="text-sm text-gray-400 hover:text-[#e11d48] transition-colors font-medium">Chart Converter</Link>
        <span className="text-sm text-[#e11d48] font-medium">Photo to Pattern</span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">Photo to Pattern</h2>
        <p className="text-gray-500 mb-6">Upload a photo of any knitted or crocheted garment and get a full written pattern to recreate it.</p>

        {/* Upload area */}
        {!preview ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300 rounded-xl py-16 flex flex-col items-center gap-3 text-gray-400 hover:border-[#e11d48] hover:text-[#e11d48] transition-colors cursor-pointer bg-white"
          >
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
            </svg>
            <span className="font-medium">Upload garment photo</span>
            <span className="text-sm">or drag and drop — JPG, PNG, HEIC</span>
          </button>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Garment preview" className="max-h-64 rounded-lg border border-gray-200 object-contain" />
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => { setPreview(null); setImage(null); setOutput(""); if (fileRef.current) fileRef.current.value = ""; }}
                  className="text-sm text-gray-400 hover:text-red-500 transition-colors"
                >
                  Remove image
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-sm text-gray-400 hover:text-[#e11d48] transition-colors"
                >
                  Change image
                </button>
              </div>
            </div>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

        {preview && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Anything to add? <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. This is knitted top-down, worsted weight, adult size medium"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#e11d48]"
            />
          </div>
        )}

        {preview && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="mt-4 w-full bg-[#e11d48] hover:bg-[#be123c] disabled:bg-gray-300 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            {loading ? "Generating pattern..." : "Generate Pattern"}
          </button>
        )}

        {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}

        {output && (
          <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Generated Pattern</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  disabled={loading}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Copy
                </button>
                <button
                  onClick={handleDownload}
                  disabled={loading}
                  className="text-sm bg-[#e11d48] hover:bg-[#be123c] text-white font-medium rounded-lg px-3 py-1.5 transition-colors"
                >
                  Save as PDF
                </button>
              </div>
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              AI-generated pattern — always swatch and adjust stitch counts before starting your project.
            </p>
            <div className="text-sm leading-relaxed">{renderOutput(output)}</div>
          </div>
        )}
      </main>
    </div>
  );
}
