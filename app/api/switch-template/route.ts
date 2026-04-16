import { NextRequest, NextResponse } from "next/server";
import { getCvData, storeTemplate } from "@/lib/storage";
import { renderPreviewHtmlForTemplate } from "@/lib/render-preview";
import { TemplateType } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const fileId = formData.get("file_id") as string | null;
    const template = (formData.get("template") as string) as TemplateType;

    if (!fileId?.trim()) {
      return NextResponse.json({ detail: "Missing file_id" }, { status: 400 });
    }
    if (template !== "digipal" && template !== "fp") {
      return NextResponse.json({ detail: "Invalid template" }, { status: 400 });
    }

    const cvData = getCvData(fileId);
    if (!cvData) {
      return NextResponse.json({ detail: "CV data not found" }, { status: 404 });
    }

    storeTemplate(fileId, template);
    const previewHtml = renderPreviewHtmlForTemplate(cvData, template);

    return NextResponse.json({ preview_html: previewHtml, template });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Template switch failed";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
