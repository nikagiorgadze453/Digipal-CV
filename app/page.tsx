"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { CvData, TemplateType } from "@/lib/types";
import FormEditor from "@/components/FormEditor";
import DigipAIChat from "@/components/DigipAIChat";
import ThemeSettings from "@/components/ThemeSettings";
import { readApiErrorDetail } from "@/lib/api-error";

type Step = "upload" | "processing" | "result";

export default function Home() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [fileId, setFileId] = useState("");
  const [cvData, setCvData] = useState<CvData | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [progress, setProgress] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [template, setTemplate] = useState<TemplateType>("digipal");
  const [toast, setToast] = useState<{ msg: string; error: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((msg: string, error = false) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  const handleFormat = async () => {
    if (!file) return;
    setStep("processing");
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => (p < 85 ? p + 1 : p));
    }, 150);

    try {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      const upRes = await fetch("/api/upload", { method: "POST", body: uploadForm });
      if (!upRes.ok) throw new Error(await readApiErrorDetail(upRes));
      const upData = await upRes.json();
      setFileId(upData.file_id);

      const fmtForm = new FormData();
      fmtForm.append("file_id", upData.file_id);
      fmtForm.append("template", template);
      // Pass extracted text directly so format works even if upload/format
      // land on different serverless instances (no shared memory)
      fmtForm.append("raw_text", upData.extracted_text_full ?? upData.extracted_text ?? "");
      const fmtRes = await fetch("/api/format", { method: "POST", body: fmtForm });
      if (!fmtRes.ok) throw new Error(await readApiErrorDetail(fmtRes));
      const fmtData = await fmtRes.json();

      clearInterval(interval);
      setProgress(100);
      setCvData(fmtData.cv_data);
      setPreviewHtml(fmtData.preview_html);
      setTimeout(() => setStep("result"), 400);
    } catch (err: unknown) {
      clearInterval(interval);
      setStep("upload");
      showToast(err instanceof Error ? err.message : "Failed", true);
    }
  };

  const handleDownload = async () => {
    if (!cvData) return;
    try {
      const res = await fetch(`/api/download?template=${template}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvData, template }),
      });
      if (!res.ok) { const e = await res.json(); alert(e.detail || "Download failed"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      const cd = res.headers.get("content-disposition") || "";
      const fn = cd.match(/filename="([^"]+)"/)?.[1] || "CV.pdf";
      a.download = fn; a.click(); URL.revokeObjectURL(url);
    } catch { alert("Download failed"); }
  };

  const handleDownloadDocx = async () => {
    if (!cvData) return;
    try {
      const res = await fetch(`/api/download-docx?template=${template}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvData, template }),
      });
      if (!res.ok) { const e = await res.json(); alert(e.detail || "Download failed"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      const cd = res.headers.get("content-disposition") || "";
      const fn = cd.match(/filename="([^"]+)"/)?.[1] || "CV.docx";
      a.download = fn; a.click(); URL.revokeObjectURL(url);
    } catch { alert("Download failed"); }
  };

  const handleCvUpdate = (newCv: CvData, html: string) => {
    setCvData(newCv);
    setPreviewHtml(html);
  };

  const handleTemplateChange = async (newTemplate: TemplateType) => {
    setTemplate(newTemplate);
    if (!fileId || !cvData) return;
    try {
      const form = new FormData();
      form.append("file_id", fileId);
      form.append("template", newTemplate);
      form.append("cv_data", JSON.stringify(cvData));
      const res = await fetch("/api/switch-template", { method: "POST", body: form });
      if (!res.ok) throw new Error(await readApiErrorDetail(res));
      const data = await res.json();
      setPreviewHtml(data.preview_html);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Template switch failed", true);
    }
  };

  const handleStartOver = () => {
    setFile(null); setFileId(""); setCvData(null); setPreviewHtml("");
    setShowChat(false); setShowEditor(false); setTemplate("digipal"); setStep("upload");
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-brand">
          <Image src="/digipal-logo.png" alt="Digipal" width={32} height={32} className="nav-logo" />
          <span>Digipal CV Formatter</span>
        </div>
        <ThemeSettings />
      </nav>

      <main className="container">
        {step === "upload" && (
          <section className="step">
            <div className="step-header">
              <div className="step-badge">1</div>
              <div>
                <h2>Upload CV</h2>
                <p className="step-desc">Drop a PDF or text file with the candidate&apos;s CV</p>
              </div>
            </div>

            {!file ? (
              <div
                className="upload-zone"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <div className="upload-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <p className="upload-text">Drag &amp; drop your CV here</p>
                <p className="upload-subtext">or click to browse — PDF, TXT supported</p>
                <input
                  ref={fileInputRef} type="file" accept=".pdf,.txt,.md" hidden
                  onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                />
              </div>
            ) : (
              <div className="file-card">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <div style={{ flex: 1 }}>
                  <div className="file-name">{file.name}</div>
                  <div className="file-size">{(file.size / 1024).toFixed(1)} KB</div>
                </div>
                <button className="btn-icon" onClick={() => setFile(null)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            )}

            <div style={{ marginTop: "1.5rem" }}>
              <button className="btn-primary" disabled={!file} onClick={handleFormat}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                Format CV with AI
              </button>
            </div>
          </section>
        )}

        {step === "processing" && (
          <section className="step">
            <div className="processing-card">
              <div className="spinner" />
              <h3>Formatting your CV...</h3>
              <p>AI is analyzing the content and restructuring it into the Digipal profile format</p>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </section>
        )}

        {step === "result" && cvData && (
          <section className="step">
            <div className="step-header">
              <div className="step-badge done">&#10003;</div>
              <div>
                <h2>Formatted Profile</h2>
                <p className="step-desc">Review, edit with Digip-AI, and download as PDF or DOCX</p>
              </div>
            </div>

            <div className="result-actions">
              <div className="template-selector">
                <label htmlFor="template-select" className="template-label">Template:</label>
                <select
                  id="template-select"
                  className="template-dropdown"
                  value={template}
                  onChange={(e) => handleTemplateChange(e.target.value as TemplateType)}
                >
                  <option value="digipal">Digipal</option>
                  <option value="fp">Future Processing</option>
                </select>
              </div>
              <button className="btn-primary" onClick={handleDownload}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download PDF
              </button>
              <button className="btn-primary" onClick={handleDownloadDocx}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download DOCX
              </button>
              <button className="btn-secondary" onClick={() => setShowEditor(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit Data
              </button>
              <button className="btn-secondary btn-chat-toggle" onClick={() => setShowChat(!showChat)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Digip-AI
              </button>
              <button className="btn-secondary" onClick={handleStartOver}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                New CV
              </button>
            </div>

            <div className="result-layout">
              <div className="preview-container">
                <div className="preview-frame" dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </div>

              {showChat && (
                <DigipAIChat
                  fileId={fileId}
                  cvData={cvData!}
                  template={template}
                  onUpdate={handleCvUpdate}
                  onClose={() => setShowChat(false)}
                />
              )}
            </div>

            {showEditor && (
              <FormEditor
                cvData={cvData}
                fileId={fileId}
                onUpdate={handleCvUpdate}
                onClose={() => setShowEditor(false)}
                showToast={showToast}
              />
            )}
          </section>
        )}

        {toast && (
          <div className={`toast ${toast.error ? "error" : ""}`}>
            <span>{toast.msg}</span>
            <button className="btn-icon" style={{ border: "none", background: "transparent", color: "rgba(255,255,255,0.7)", width: 24, height: 24 }} onClick={() => setToast(null)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Digipal CV Formatter &middot; Powered by Digip-AI</p>
      </footer>
    </>
  );
}
