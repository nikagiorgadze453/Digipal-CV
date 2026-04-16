import { NextRequest, NextResponse } from "next/server";
import { chatWithAI } from "@/lib/cv-formatter";
import { getCvData, storeCvData, getTemplate } from "@/lib/storage";
import { renderPreviewHtmlForTemplate } from "@/lib/render-preview";
import { getServerAnthropicApiKey } from "@/lib/api-key";
import { coerceCvData } from "@/lib/cv-guards";
import { TemplateType } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const fileId = formData.get("file_id") as string | null;
    const message = (formData.get("message") as string | null)?.trim() ?? "";
    const cvDataStr = formData.get("cv_data") as string | null;
    const templateParam = (formData.get("template") as string | null) as TemplateType | null;
    const apiKey = getServerAnthropicApiKey();

    if (!message) {
      return NextResponse.json({ detail: "Message is required" }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json(
        { detail: "Anthropic API key is not configured on the server. Set ANTHROPIC_API_KEY or CV_ANTHROPIC_KEY in the environment." },
        { status: 503 }
      );
    }

    // Use passed cv_data first, fall back to in-memory storage
    let rawCv = fileId ? getCvData(fileId) : null;
    if (!rawCv && cvDataStr) {
      try { rawCv = JSON.parse(cvDataStr); } catch { /* ignore */ }
    }
    if (!rawCv) {
      return NextResponse.json({ detail: "CV data not found" }, { status: 404 });
    }

    const template: TemplateType = templateParam || (fileId ? getTemplate(fileId) : "digipal");
    const cvData = coerceCvData(rawCv);
    const result = await chatWithAI(cvData, message, apiKey);
    const newCv = result.cv_data;
    if (fileId) storeCvData(fileId, newCv);
    const previewHtml = renderPreviewHtmlForTemplate(newCv, template);

    return NextResponse.json({
      message: result.message,
      cv_data: newCv,
      preview_html: previewHtml,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Chat failed";
    return NextResponse.json({ detail: `AI error: ${msg}` }, { status: 500 });
  }
}
