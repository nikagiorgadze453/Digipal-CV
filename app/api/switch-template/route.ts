import { NextRequest, NextResponse } from "next/server";
import { getCvData, storeTemplate } from "@/lib/storage";
import { renderPreviewHtmlForTemplate } from "@/lib/render-preview";
import { CvData, TemplateType } from "@/lib/types";
import { coerceCvData } from "@/lib/cv-guards";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const fileId = formData.get("file_id") as string | null;
    const template = (formData.get("template") as string) as TemplateType;
    const cvDataStr = formData.get("cv_data") as string | null;

    if (template !== "digipal" && template !== "fp") {
      return NextResponse.json({ detail: "Invalid template" }, { status: 400 });
    }

    // Use passed cv_data first, fall back to in-memory (local dev)
    let raw: CvData | undefined;
    if (cvDataStr) {
      try { raw = JSON.parse(cvDataStr); } catch { /* ignore */ }
    }
    if (!raw && fileId) {
      raw = getCvData(fileId) ?? undefined;
    }
    if (!raw) {
      return NextResponse.json({ detail: "CV data not found" }, { status: 404 });
    }

    if (fileId) storeTemplate(fileId, template);
    const cvData = coerceCvData(raw);
    const previewHtml = renderPreviewHtmlForTemplate(cvData, template);

    return NextResponse.json({ preview_html: previewHtml, template });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Template switch failed";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
