import { NextRequest, NextResponse } from "next/server";
import { storeCvData, getTemplate } from "@/lib/storage";
import { renderPreviewHtmlForTemplate } from "@/lib/render-preview";
import { coerceCvData } from "@/lib/cv-guards";
import { TemplateType } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const fileId = formData.get("file_id") as string | null;
    const cvDataStr = formData.get("cv_data") as string | null;

    if (!fileId?.trim()) {
      return NextResponse.json({ detail: "Missing file_id" }, { status: 400 });
    }
    if (!cvDataStr?.trim()) {
      return NextResponse.json({ detail: "Missing cv_data" }, { status: 400 });
    }

    let raw: unknown;
    try {
      raw = JSON.parse(cvDataStr);
    } catch {
      return NextResponse.json({ detail: "cv_data is not valid JSON" }, { status: 400 });
    }

    const template = ((formData.get("template") as string) || getTemplate(fileId)) as TemplateType;
    const data = coerceCvData(raw);
    storeCvData(fileId, data);
    const previewHtml = renderPreviewHtmlForTemplate(data, template);

    return NextResponse.json({ preview_html: previewHtml, cv_data: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ detail: msg }, { status: 400 });
  }
}
