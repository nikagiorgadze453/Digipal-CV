import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPdf } from "@/lib/cv-parser";
import { storeUpload } from "@/lib/storage";
import { randomUUID } from "crypto";

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ detail: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { detail: `File too large (max ${MAX_FILE_BYTES / (1024 * 1024)} MB)` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text: string;

    if (file.name.endsWith(".pdf")) {
      text = await extractTextFromPdf(buffer);
    } else {
      text = buffer.toString("utf-8");
    }

    const fileId = randomUUID();
    storeUpload(fileId, text);

    return NextResponse.json({
      file_id: fileId,
      filename: file.name,
      extracted_text: text.slice(0, 2000),   // preview only
      extracted_text_full: text,              // full text for format step
      text_length: text.length,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ detail: msg }, { status: 400 });
  }
}
