"use client";

import React, { useState, useRef, useCallback } from "react";
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
          const hasSep = tableLines.some(l => isSeparator(l));
          if (!hasSep) {
            out.push(`<pre class="schema">${tableLines.join("\n")}</pre>`);
            continue;
          }
          const dataRows = tableLines.filter(l => !isSeparator(l));
          let tbl = '<table class="md-table">';
          dataRows.forEach((row, ri) => {
            const cells = row.split("|").slice(1, -1);
            const tag = ri === 0 ? "th" : "td";
            tbl += "<tr>" + cells.map(c => `<${tag}>${inlineBold(c.trim())}</${tag}>`).join("") + "</tr>";
          });
          tbl += "</table>";
          out.push(tbl);
        } else if (line === "" || /^---+$/.test(line.trim())) {
          i++;
        } else if (line.trim().startsWith("```")) {
          // backtick code fence — collect content until closing ```
          i++;
          const fenceLines: string[] = [];
          while (i < arr.length && !arr[i].trim().startsWith("```")) { fenceLines.push(arr[i]); i++; }
          if (i < arr.length) i++; // skip closing ```
          if (fenceLines.length > 0) {
            out.push(`<pre class="schema">${fenceLines.join("\n")}</pre>`);
          }
        } else if (line.startsWith("## ")) {
          out.push(`<h2 class="sec">${inlineBold(line.slice(3))}</h2>`);
          i++;
        } else if (line.startsWith("#### ")) {
          out.push(`<h3 class="sub">${inlineBold(line.slice(5))}</h3>`);
          i++;
        } else if (line.startsWith("### ")) {
          out.push(`<h3 class="sub">${inlineBold(line.slice(4))}</h3>`);
          i++;
        } else if (line.startsWith("- ")) {
          out.push(`<li>${inlineBold(line.slice(2))}</li>`);
          i++;
        } else if (/^\*\*/.test(line)) {
          const m = line.match(/^\*\*([^*]+)\*\*:?\s*(.*)/);
          if (m) {
            out.push(`<p class="rnd"><strong>${m[1]}:</strong> ${inlineBold(m[2])}</p>`);
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

    // Strip any leading markdown heading markers from about text
    const rawAbout = sections.about.filter(Boolean).join(" ").replace(/^#+\s*/, "");
    const gaugeHtml = processLinesForPdf(sections.gauge);
    const sizingHtml = processLinesForPdf(sections.sizing);
    const instrHtml = processLinesForPdf(sections.instructions);
    const notesText = sections.notes.filter(Boolean).join(" ");

    const imgTag = preview ? `<img src="${preview}" style="max-height:220px;max-width:220px;object-fit:contain;border-radius:4px;" alt="Garment" />` : "";

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Generated Pattern — CraftersKit</title>
<style>
  @page { margin: 2cm 2.2cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 10.5pt; color: #1a1a1a; line-height: 1.7; }

  /* Masthead */
  .masthead { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 6px; }
  .masthead-text { flex: 1; }
  .brand { font-family: Arial, Helvetica, sans-serif; font-size: 7.5pt; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #be123c; text-align: right; white-space: nowrap; }
  h1.title { font-family: Arial, Helvetica, sans-serif; font-size: 22pt; font-weight: 900; color: #1a1a1a; line-height: 1.15; margin-bottom: 6px; }
  .subtitle { font-size: 9.5pt; color: #555; font-style: italic; line-height: 1.5; }
  .rule { border: none; border-top: 2px solid #be123c; margin: 10px 0 16px; }
  .disclaimer { font-size: 8pt; color: #888; font-style: italic; margin-bottom: 16px; }

  /* Section headers — professional, tight */
  h2.sec { font-family: Arial, Helvetica, sans-serif; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: #be123c; border-bottom: 1.5px solid #be123c; padding-bottom: 2px; margin: 22px 0 9px; }

  /* Sub-section (### and ####) */
  h3.sub { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; font-weight: 700; color: #1a1a1a; margin: 14px 0 3px; }

  /* Spec grid for materials+gauge */
  .spec-grid { display: flex; gap: 32px; margin-bottom: 4px; }
  .spec-col { flex: 1; }

  /* Body elements */
  p { font-size: 10pt; margin: 3px 0; }
  p.rnd { margin-top: 5px; }
  p.rnd strong { font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; }
  li { font-size: 10pt; list-style: disc; margin-left: 18px; padding: 1.5px 0; }
  strong { font-family: Arial, Helvetica, sans-serif; }

  /* Abbreviations 2-col */
  .abbr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px 24px; margin: 6px 0; }
  .abbr-grid p { font-size: 9.5pt; margin: 2px 0; }

  /* Tables */
  .md-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 8px 0; page-break-inside: avoid; }
  .md-table th { background: #be123c; color: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 8.5pt; font-weight: 700; text-align: left; padding: 5px 9px; }
  .md-table td { padding: 4px 9px; border-bottom: 1px solid #e8e8e8; vertical-align: top; }
  .md-table tr:nth-child(even) td { background: #f7f7f7; }

  /* ASCII schematic */
  pre.schema { font-family: 'Courier New', monospace; font-size: 8pt; background: #f9f9f9; border: 1px solid #e0e0e0; padding: 8px 10px; margin: 8px 0; white-space: pre; overflow-x: auto; }

  /* Notes */
  .notes { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 9.5pt; font-style: italic; color: #555; }
  .notes strong { font-style: normal; }

  /* Footer */
  .footer { margin-top: 24px; padding-top: 6px; border-top: 1px solid #e0e0e0; font-size: 7pt; color: #bbb; font-family: Arial, Helvetica, sans-serif; text-align: center; }
</style>
</head>
<body>

<div class="masthead">
  <div class="masthead-text">
    <h1 class="title">Knitting Pattern</h1>
    <p class="subtitle">${rawAbout}</p>
  </div>
  ${imgTag ? `<div>${imgTag}</div>` : ""}
  <div class="brand">CraftersKit.com</div>
</div>
<hr class="rule">
<p class="disclaimer">AI-generated from photo &mdash; always swatch and adjust before starting.</p>

${gaugeHtml || sizingHtml ? `
<div class="spec-grid">
  ${gaugeHtml ? `<div><h2 class="sec">Materials &amp; Gauge</h2>${gaugeHtml}</div>` : ""}
  ${sizingHtml ? `<div><h2 class="sec">Sizes &amp; Measurements</h2>${sizingHtml}</div>` : ""}
</div>` : ""}

<h2 class="sec">Pattern Instructions</h2>
${instrHtml}

${notesText ? `<div class="notes"><strong>Notes:</strong> ${notesText}</div>` : ""}

<div class="footer">Generated by CraftersKit &mdash; crafterskit.com &mdash; AI estimate only. Always swatch to verify gauge before beginning.</div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  }

  function bold(text: string) {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1
        ? <strong key={i} className="font-semibold text-gray-900">{part}</strong>
        : <React.Fragment key={i}>{part}</React.Fragment>
    );
  }

  function parseLines(lines: string[]) {
    const out: React.ReactNode[] = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim() || /^---+$/.test(line.trim())) { i++; continue; }
      // backtick fence → <pre> block
      if (line.trim().startsWith("```")) {
        i++;
        const fenceLines: string[] = [];
        while (i < lines.length && !lines[i].trim().startsWith("```")) { fenceLines.push(lines[i]); i++; }
        if (i < lines.length) i++;
        if (fenceLines.length > 0) {
          out.push(<pre key={`fence-${i}`} className="text-xs font-mono bg-gray-50 border border-gray-200 rounded p-3 my-2 overflow-x-auto whitespace-pre">{fenceLines.join("\n")}</pre>);
        }
        continue;
      }
      // ## heading inside a section
      if (line.startsWith("## ")) { out.push(<h3 key={`h2-${i}`} className="text-base font-bold text-gray-900 mt-5 mb-1 border-b border-gray-200 pb-1">{line.slice(3)}</h3>); i++; continue; }
      // ### subheading
      if (line.startsWith("### ")) {
        out.push(<h4 key={`h3-${i}`} className="text-sm font-bold text-gray-800 mt-4 mb-1 border-b border-gray-200 pb-1">{line.slice(4)}</h4>);
        i++; continue;
      }
      // Markdown table (only if a separator row |---|---| exists in the group)
      if (line.trim().startsWith("|") && line.includes("|", 1)) {
        const tblLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith("|")) { tblLines.push(lines[i]); i++; }
        const hasSeparator = tblLines.some(l => /^\|[\s|:-]+\|$/.test(l.trim()));
        if (!hasSeparator) {
          // ASCII diagram — render as preformatted text
          out.push(<pre key={`pre-${i}`} className="text-xs text-gray-600 font-mono bg-gray-50 border border-gray-200 rounded p-3 my-2 overflow-x-auto whitespace-pre">{tblLines.join("\n")}</pre>);
          continue;
        }
        const rows = tblLines.filter(l => !/^\|[\s|:-]+\|$/.test(l.trim()));
        out.push(
          <div key={`tbl-${i}`} className="overflow-x-auto my-3 rounded-lg border border-rose-200">
            <table className="w-full text-sm border-collapse">
              <tbody>
                {rows.map((row, ri) => {
                  const cells = row.split("|").slice(1, -1);
                  return (
                    <tr key={ri} className={ri === 0 ? "bg-[#be123c] text-white" : ri % 2 === 1 ? "bg-rose-50" : "bg-white"}>
                      {cells.map((cell, ci) => ri === 0
                        ? <th key={ci} className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wide whitespace-nowrap">{cell.trim()}</th>
                        : <td key={ci} className="px-3 py-1.5 border-t border-rose-100">{bold(cell.trim())}</td>
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
      // Bullet
      if (line.startsWith("- ")) {
        const items: string[] = [];
        while (i < lines.length && lines[i].startsWith("- ")) { items.push(lines[i].slice(2)); i++; }
        out.push(
          <ul key={`ul-${i}`} className="my-2 space-y-1 list-disc list-outside pl-5">
            {items.map((item, ii) => <li key={ii} className="text-gray-800 text-sm leading-relaxed">{bold(item)}</li>)}
          </ul>
        );
        continue;
      }
      // Bold heading line (e.g. **Row 1 (RS):** ...)
      if (/^\*\*/.test(line)) {
        const m = line.match(/^\*\*([^*]+)\*\*:?\s*(.*)/);
        if (m) {
          out.push(<p key={`bh-${i}`} className="text-sm mt-2"><span className="font-semibold text-[#be123c]">{m[1]}:</span> <span className="text-gray-800">{bold(m[2])}</span></p>);
        } else {
          out.push(<p key={`p-${i}`} className="text-sm text-gray-800 mt-1">{bold(line)}</p>);
        }
        i++; continue;
      }
      out.push(<p key={`p-${i}`} className="text-sm text-gray-700 mt-1">{bold(line)}</p>);
      i++;
    }
    return out;
  }

  function renderOutput(text: string) {
    const allLines = text.split("\n");
    const sections: Record<string, string[]> = { about: [], canSee: [], gauge: [], sizing: [], instructions: [], notes: [] };
    let cur = "about";
    for (const line of allLines) {
      if (line.startsWith("## About")) { cur = "about"; continue; }
      if (line.startsWith("## What I Can See")) { cur = "canSee"; continue; }
      if (line.startsWith("## Gauge")) { cur = "gauge"; continue; }
      if (line.startsWith("## Sizing")) { cur = "sizing"; continue; }
      if (line.startsWith("## Pattern Instructions")) { cur = "instructions"; continue; }
      if (line.startsWith("## Notes")) { cur = "notes"; continue; }
      sections[cur]?.push(line);
    }

    const SectionHead = ({ title }: { title: string }) => (
      <h3 className="text-xs font-bold uppercase tracking-widest text-[#be123c] border-b border-rose-200 pb-1 mb-3 mt-5">{title}</h3>
    );

    return (
      <div className="space-y-1">
        {sections.about.filter(Boolean).length > 0 && (
          <p className="text-sm text-gray-600 italic mb-4">{sections.about.filter(Boolean).join(" ")}</p>
        )}
        {sections.canSee.filter(Boolean).length > 0 && (
          <div>
            <SectionHead title="What I Can See" />
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">{parseLines(sections.canSee)}</div>
          </div>
        )}
        {(sections.gauge.filter(Boolean).length > 0 || sections.sizing.filter(Boolean).length > 0) && (
          <div className="flex flex-col gap-4 mt-2">
            {sections.gauge.filter(Boolean).length > 0 && (
              <div>
                <SectionHead title="Gauge & Materials" />
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">{parseLines(sections.gauge)}</div>
              </div>
            )}
            {sections.sizing.filter(Boolean).length > 0 && (
              <div>
                <SectionHead title="Sizing" />
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">{parseLines(sections.sizing)}</div>
              </div>
            )}
          </div>
        )}
        {sections.instructions.filter(Boolean).length > 0 && (
          <div>
            <SectionHead title="Pattern Instructions" />
            {parseLines(sections.instructions)}
          </div>
        )}
        {sections.notes.filter(Boolean).length > 0 && (
          <div>
            <SectionHead title="Notes" />
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900 italic">{sections.notes.filter(Boolean).join(" ")}</div>
          </div>
        )}
      </div>
    );
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
        <Link href="/written-to-chart" className="text-sm text-gray-400 hover:text-[#e11d48] transition-colors font-medium">Written to Chart</Link>
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
