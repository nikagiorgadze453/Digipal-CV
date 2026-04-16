import { NextRequest, NextResponse } from "next/server";
import { formatCvWithAI } from "@/lib/cv-formatter";
import { getUpload, storeCvData, storeTemplate } from "@/lib/storage";
import { renderPreviewHtmlForTemplate } from "@/lib/render-preview";
import { getServerAnthropicApiKey } from "@/lib/api-key";
import { TemplateType } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const fileId = formData.get("file_id") as string | null;
    const template = ((formData.get("template") as string) || "digipal") as TemplateType;
    const apiKey = getServerAnthropicApiKey();

    if (!fileId?.trim()) {
      return NextResponse.json({ detail: "Missing file_id" }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          detail:
            "Anthropic API key is not configured on the server. Set ANTHROPIC_API_KEY or CV_ANTHROPIC_KEY in the environment (e.g. .env.local for local dev, or your host’s dashboard for deployment).",
        },
        { status: 503 }
      );
    }

    // Accept raw text directly (for serverless environments where upload/format
    // may run on different instances with no shared memory)
    const rawText = formData.get("raw_text") as string | null;

    let textToFormat: string;
    if (rawText?.trim()) {
      textToFormat = rawText;
    } else {
      const entry = getUpload(fileId);
      if (!entry) {
        return NextResponse.json(
          { detail: "Uploaded file not found. Please try again." },
          { status: 404 }
        );
      }
      textToFormat = entry.text;
    }

    const cvData = await formatCvWithAI(textToFormat, apiKey);
    storeCvData(fileId, cvData);
    storeTemplate(fileId, template);
    const previewHtml = renderPreviewHtmlForTemplate(cvData, template);

    return NextResponse.json({
      file_id: fileId,
      cv_data: cvData,
      preview_html: previewHtml,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Formatting failed";
    const lower = msg.toLowerCase();
    if (
      lower.includes("401") ||
      lower.includes("authentication") ||
      lower.includes("invalid x-api-key") ||
      lower.includes("x-api-key")
    ) {
      return NextResponse.json(
        {
          detail:
            "Anthropic rejected the server API key (invalid or revoked). Create a new key at https://console.anthropic.com/settings/keys and update ANTHROPIC_API_KEY or CV_ANTHROPIC_KEY in your server environment.",
        },
        { status: 401 }
      );
    }
    return NextResponse.json({ detail: `AI formatting failed: ${msg}` }, { status: 500 });
  }
}
