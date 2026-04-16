"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { CvData, TemplateType } from "@/lib/types";
import { readApiErrorDetail } from "@/lib/api-error";

interface Props {
  fileId: string;
  cvData: CvData;
  template: TemplateType;
  onUpdate: (cv: CvData, html: string) => void;
  onClose: () => void;
}

interface Message {
  text: string;
  isUser: boolean;
  /** First assistant message only — trusted static HTML from our code */
  trustedHtml?: boolean;
}

const WELCOME_HTML =
  `Hi! I'm <strong>Digip-AI</strong>. Tell me what you'd like to change in the CV. For example:<br><em>"Change the title to Senior Data Engineer"</em><br><em>"Add Python to programming languages"</em><br><em>"Make the summary shorter"</em>`;

export default function DigipAIChat({ fileId, cvData, template, onUpdate, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { text: WELCOME_HTML, isUser: false, trustedHtml: true },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((m) => [...m, { text: msg, isUser: true }]);
    setLoading(true);

    const fd = new FormData();
    fd.append("file_id", fileId);
    fd.append("message", msg);
    fd.append("cv_data", JSON.stringify(cvData));
    fd.append("template", template);

    try {
      const res = await fetch("/api/chat", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await readApiErrorDetail(res));
      const data = await res.json();
      onUpdate(data.cv_data, data.preview_html);
      setMessages((m) => [...m, { text: data.message, isUser: false }]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Something went wrong";
      setMessages((m) => [...m, { text: errMsg, isUser: false }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <Image src="/digipal-logo.png" alt="" width={28} height={28} className="chat-logo" />
        <div>
          <div className="chat-title">Digip-AI</div>
          <div className="chat-subtitle">Ask me to edit the CV</div>
        </div>
        <button className="btn-icon" style={{ marginLeft: "auto", border: "none" }} onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={m.isUser ? "chat-msg-user" : "chat-msg-ai"}>
            {m.trustedHtml ? (
              <div className="chat-bubble" dangerouslySetInnerHTML={{ __html: m.text }} />
            ) : (
              <div className="chat-bubble" style={{ whiteSpace: "pre-wrap" }}>
                {m.text}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="chat-msg-ai">
            <div className="chat-bubble">
              <div className="chat-typing"><span /><span /><span /></div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-area">
        <input
          className="chat-input"
          placeholder="Tell Digip-AI what to change..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button type="button" className="btn-send" onClick={() => void send()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  );
}
