"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";

export default function ChartConverterPage() {
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

  async function handleConvert() {
    if (!image) return;
    setLoading(true);
    setError("");
    setOutput("");

    try {
      const res = await fetch("/api/chart-convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, mimeType, notes }),
      });
      if (!res.ok) throw new Error("Conversion failed");
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

    // Split into sections
    const sections: Record<string, string[]> = { about: [], key: [], instructions: [], notes: [], setup: [] };
    let current = "about";
    for (const line of lines) {
      if (line.startsWith("## About")) { current = "about"; continue; }
      if (line.startsWith("## Stitch Key")) { current = "key"; continue; }
      if (line.startsWith("## Written Instructions")) { current = "instructions"; continue; }
      if (line.startsWith("## Notes")) { current = "notes"; continue; }
      if (current === "instructions" && line.startsWith("**Setup")) { sections.setup.push(line); continue; }
      sections[current]?.push(line);
    }

    function ib(s: string) { return s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>"); }

    function processInstr(arr: string[]): string {
      const out: string[] = [];
      let rowIdx = 0;
      let i = 0;
      while (i < arr.length) {
        const line = arr[i];
        if (!line.trim() || /^---+$/.test(line.trim())) { i++; continue; }
        if (line.trim().startsWith("```")) {
          i++;
          const fence: string[] = [];
          while (i < arr.length && !arr[i].trim().startsWith("```")) { fence.push(arr[i]); i++; }
          if (i < arr.length) i++;
          if (fence.length > 0) out.push(`<pre style="font-family:'Courier New',monospace;font-size:8pt;background:#f9f9f9;border:1px solid #e0e0e0;padding:8px 10px;margin:8px 0;white-space:pre;overflow-x:auto;">${fence.join("\n")}</pre>`);
          continue;
        }
        if (line.startsWith("## ")) { out.push(`<h2 style="font-family:Arial,sans-serif;font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#be123c;border-bottom:1.5px solid #be123c;padding-bottom:2px;margin:22px 0 9px;">${ib(line.slice(3))}</h2>`); i++; continue; }
        if (line.startsWith("### ") || line.startsWith("#### ")) { const s = line.startsWith("#### ") ? line.slice(5) : line.slice(4); out.push(`<h3 style="font-family:Arial,sans-serif;font-size:10pt;font-weight:700;color:#1a1a1a;margin:14px 0 3px;">${ib(s)}</h3>`); i++; continue; }
        const m = line.match(/^\*\*([^*]+)\*\*:?\s*(.*)/);
        if (m) {
          const bg = rowIdx % 2 === 0 ? "#f8f8f8" : "#ffffff";
          out.push(`<div class="row" style="background:${bg}"><span class="row-label">${m[1]}</span><span class="row-body">${ib(m[2])}</span></div>`);
          rowIdx++; i++; continue;
        }
        if (line.startsWith("- ")) { out.push(`<li>${ib(line.slice(2))}</li>`); i++; continue; }
        out.push(`<p>${ib(line)}</p>`);
        i++;
      }
      return out.join("\n");
    }

    const aboutText = sections.about.filter(Boolean).join(" ").replace(/^#+\s*/, "");
    const setupLine = sections.setup[0] || "";
    const setupM = setupLine.match(/^\*\*([^*]+)\*\*:?\s*(.*)/);
    const setupHtml = setupM ? `<p class="setup"><strong>${setupM[1]}:</strong> ${ib(setupM[2])}</p>` : "";
    const keyHtml = sections.key.filter(Boolean).map(l => l.startsWith("- ") ? `<li>${ib(l.slice(2))}</li>` : `<p>${ib(l)}</p>`).join("\n");
    const instrHtml = processInstr(sections.instructions);
    const notesText = sections.notes.filter(Boolean).join(" ");

    const imgTag = preview ? `<img src="${preview}" style="max-height:180px;max-width:200px;object-fit:contain;border-radius:4px;" alt="Chart" />` : "";

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Written Pattern — CraftersKit</title>
<style>
  @page { margin: 2cm 2.2cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 10.5pt; color: #1a1a1a; line-height: 1.7; }

  .masthead { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 6px; }
  .masthead-text { flex: 1; }
  .brand { font-family: Arial, Helvetica, sans-serif; font-size: 7.5pt; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #be123c; text-align: right; white-space: nowrap; }
  h1.title { font-family: Arial, Helvetica, sans-serif; font-size: 22pt; font-weight: 900; color: #1a1a1a; line-height: 1.15; margin-bottom: 6px; }
  .subtitle { font-size: 9.5pt; color: #555; font-style: italic; line-height: 1.5; }
  .rule { border: none; border-top: 2px solid #be123c; margin: 10px 0 16px; }

  h2.sec { font-family: Arial, Helvetica, sans-serif; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: #be123c; border-bottom: 1.5px solid #be123c; padding-bottom: 2px; margin: 22px 0 9px; }

  /* Stitch key */
  .key-list { margin: 0; }
  .key-list li { font-size: 10pt; list-style: none; padding: 3px 0; border-bottom: 1px solid #f0f0f0; }
  .key-list li:last-child { border-bottom: none; }

  /* Setup callout */
  p.setup { font-size: 10pt; border-left: 3px solid #be123c; padding: 6px 10px; margin: 12px 0; background: #fafafa; }
  p.setup strong { font-family: Arial, Helvetica, sans-serif; color: #be123c; }

  /* Instruction rows */
  .row { display: flex; gap: 12px; padding: 3.5px 6px; page-break-inside: avoid; }
  .row-label { font-weight: 700; font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #be123c; white-space: nowrap; min-width: 110px; flex-shrink: 0; }
  .row-body { font-size: 10pt; color: #1a1a1a; }

  p { font-size: 10pt; margin: 3px 0; }
  li { font-size: 10pt; list-style: disc; margin-left: 18px; padding: 1.5px 0; }
  strong { font-family: Arial, Helvetica, sans-serif; }

  .notes { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 9.5pt; font-style: italic; color: #555; }
  .notes strong { font-style: normal; }

  .footer { margin-top: 24px; padding-top: 6px; border-top: 1px solid #e0e0e0; font-size: 7pt; color: #bbb; font-family: Arial, Helvetica, sans-serif; text-align: center; }
</style>
</head>
<body>

<div class="masthead">
  <div class="masthead-text">
    <h1 class="title">Written Pattern</h1>
    <p class="subtitle">${aboutText}</p>
  </div>
  ${imgTag ? `<div>${imgTag}</div>` : ""}
  <div class="brand">CraftersKit.com</div>
</div>
<hr class="rule">

<h2 class="sec">Stitch Key</h2>
<ul class="key-list">${keyHtml}</ul>

${setupHtml}

<h2 class="sec">Written Instructions</h2>
${instrHtml}

${notesText ? `<div class="notes"><strong>Notes:</strong> ${notesText}</div>` : ""}

<div class="footer">Generated by CraftersKit &mdash; crafterskit.com &mdash; Always double-check stitch counts against the original chart as you work.</div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  }

  // Render markdown-ish output
  function renderOutput(text: string) {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("## ")) return <h2 key={i} className="text-xl font-bold text-gray-900 mt-6 mb-2">{line.slice(3)}</h2>;
      if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-semibold text-gray-900 mt-1">{line.slice(2, -2)}</p>;
      if (/^\*\*Row \d+/.test(line) || /^\*\*Round \d+/.test(line) || /^\*\*Rnd \d+/.test(line)) {
        const match = line.match(/^\*\*([^*]+)\*\*:?\s*(.*)/);
        if (match) return <p key={i} className="mt-1"><span className="font-semibold text-gray-900">{match[1]}:</span> <span className="text-gray-800">{match[2]}</span></p>;
      }
      if (line.startsWith("- ")) return <li key={i} className="ml-4 text-gray-800 list-disc">{line.slice(2)}</li>;
      if (line === "") return <div key={i} className="h-2" />;
      return <p key={i} className="text-gray-800">{line}</p>;
    });
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
            <p className="text-lg font-semibold text-gray-800">Drop your chart image here</p>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
        <Link href="/" className="text-xl font-bold text-gray-900">CraftersKit</Link>
        <Link href="/gauge-calculator" className="text-sm text-gray-400 hover:text-[#e11d48] transition-colors font-medium">Gauge Calculator</Link>
        <span className="text-sm text-[#e11d48] font-medium">Chart Converter</span>
        <Link href="/photo-to-pattern" className="text-sm text-gray-400 hover:text-[#e11d48] transition-colors font-medium">Photo to Pattern</Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">Chart to Written Pattern</h2>
        <p className="text-gray-500 mb-6">Upload a photo of any knitting or crochet chart and get complete written row-by-row instructions.</p>

        {/* Upload area */}
        {!preview ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300 rounded-xl py-16 flex flex-col items-center gap-3 text-gray-400 hover:border-[#e11d48] hover:text-[#e11d48] transition-colors cursor-pointer bg-white"
          >
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            <span className="font-medium">Upload chart image</span>
            <span className="text-sm">or drag and drop — JPG, PNG, HEIC</span>
          </button>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Chart preview" className="max-h-64 rounded-lg border border-gray-200 object-contain" />
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

        {/* Optional notes */}
        {preview && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Anything to add? <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. This is knitting worked flat, the grey squares are knit stitches"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#e11d48]"
            />
          </div>
        )}

        {/* Convert button */}
        {preview && (
          <button
            type="button"
            onClick={handleConvert}
            disabled={loading}
            className="mt-4 w-full bg-[#e11d48] hover:bg-[#be123c] disabled:bg-gray-300 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            {loading ? "Converting chart..." : "Convert to Written Pattern"}
          </button>
        )}

        {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}

        {/* Output */}
        {output && (
          <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Written Instructions</h3>
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
            <div className="text-sm leading-relaxed">{renderOutput(output)}</div>
          </div>
        )}
      </main>
    </div>
  );
}
