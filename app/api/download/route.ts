import { NextRequest, NextResponse } from "next/server";
import { getCvData, getTemplate } from "@/lib/storage";
import { CvData, TemplateType } from "@/lib/types";
import { coerceCvData } from "@/lib/cv-guards";
import PDFDocument from "pdfkit";
import path from "path";

function safeDownloadBasename(name: string): string {
  const s = name.replace(/[^\w\s-]+/g, "").replace(/\s+/g, "_").slice(0, 80);
  return s || "CV";
}

const NAVY = "#070422";
const GREEN = "#51e0ac";
const BLACK = "#000000";

const FP_DARK = "#333333";
const FP_GRAY = "#7F7F7F";
const FP_SUMMARY = "#595959";
const FP_ORANGE = "#E36C0A";

const FONTS_DIR = path.join(process.cwd(), "fonts");

function registerFonts(doc: PDFKit.PDFDocument) {
  doc.registerFont("Poppins", path.join(FONTS_DIR, "Poppins-Regular.ttf"));
  doc.registerFont("Poppins-SemiBold", path.join(FONTS_DIR, "Poppins-SemiBold.ttf"));
  doc.registerFont("Poppins-Bold", path.join(FONTS_DIR, "Poppins-Bold.ttf"));
  doc.registerFont("Poppins-Italic", path.join(FONTS_DIR, "Poppins-Italic.ttf"));
  doc.registerFont("PTSans", path.join(FONTS_DIR, "PTSans-Regular.ttf"));
  doc.registerFont("PTSans-Bold", path.join(FONTS_DIR, "PTSans-Bold.ttf"));
  doc.registerFont("PTSans-Italic", path.join(FONTS_DIR, "PTSans-Italic.ttf"));
  doc.registerFont("PTSans-BoldItalic", path.join(FONTS_DIR, "PTSans-BoldItalic.ttf"));
}

function generatePdf(cv: CvData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margins: { top: 50, bottom: 50, left: 60, right: 60 } });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    registerFonts(doc);

    const pw = 475;

    // Logo (top right)
    try {
      const logoPath = path.join(process.cwd(), "public", "digipal-logo.png");
      doc.image(logoPath, doc.page.width - 60 - 35, 45, { width: 35 });
    } catch { /* logo optional */ }

    // Name — Poppins SemiBold 12pt, navy
    doc.font("Poppins-SemiBold").fontSize(12).fillColor(NAVY).text(cv.name);
    doc.moveDown(0.1);

    // Title — Poppins Regular 12pt, navy
    doc.font("Poppins").fontSize(12).fillColor(NAVY).text(cv.title);
    doc.moveDown(0.4);

    // Profile summary — Poppins Regular 10pt, black, justified
    doc.font("Poppins").fontSize(10).fillColor(BLACK).text(cv.profile_summary, { align: "justify" });
    doc.moveDown(0.2);

    // Domain Experience
    doc.font("Poppins-Bold").fontSize(10).fillColor(BLACK).text("Domain Experience: ", { continued: true });
    doc.font("Poppins").text(cv.domain_experience);
    doc.moveDown(0.6);

    // Section heading helper
    function sectionTitle(title: string) {
      doc.moveDown(0.2);
      doc.font("Poppins-SemiBold").fontSize(12).fillColor(GREEN).text(title.toUpperCase());
      doc.moveDown(0.3);
    }

    // ---- PROFESSIONAL SKILLS ----
    sectionTitle("Professional Skills");

    const skillRows: [string, string][] = [
      ["Operating Systems", cv.skills.operating_systems],
      ["Programming Languages", cv.skills.programming_languages],
      ["Frameworks", cv.skills.frameworks],
      ["Libraries", cv.skills.libraries],
      ["Development Tools", cv.skills.development_tools],
      ["Data Management & Databases", cv.skills.databases],
      ["Software Development Approaches\n& Methodologies", cv.skills.methodologies],
      ["Software Design & Architecture", cv.skills.architecture],
      ["Testing Frameworks and Tools:", cv.skills.testing],
      ["Cloud Providers & Services", cv.skills.cloud],
      ["DevOps and CI/CD Tools", cv.skills.devops],
      ["Other Skills", cv.skills.other],
    ];

    const col1W = 180;
    const col2W = pw - col1W;
    const cellPad = 4;

    for (const [label, value] of skillRows) {
      if (!value) continue;
      const startY = doc.y;
      const x = doc.x;

      // Measure label height
      doc.font("Poppins").fontSize(10).fillColor(BLACK);
      const labelH = doc.heightOfString(label, { width: col1W - cellPad * 2 });

      // Measure value height
      doc.font("Poppins").fontSize(10);
      const valueH = doc.heightOfString(value, { width: col2W - cellPad * 2 });

      const rowH = Math.max(labelH, valueH) + cellPad * 2;

      // Check page break
      if (startY + rowH > 750) {
        doc.addPage();
      }

      const drawY = doc.y;

      // Draw borders
      doc.rect(x, drawY, col1W, rowH).stroke(BLACK);
      doc.rect(x + col1W, drawY, col2W, rowH).stroke(BLACK);

      // Draw text
      doc.font("Poppins").fontSize(10).fillColor(BLACK);
      doc.text(label, x + cellPad, drawY + cellPad, { width: col1W - cellPad * 2 });

      doc.font("Poppins").fontSize(10).fillColor(BLACK);
      doc.text(value, x + col1W + cellPad, drawY + cellPad, { width: col2W - cellPad * 2 });

      doc.x = x;
      doc.y = drawY + rowH;
    }
    doc.moveDown(0.4);

    // ---- WORK EXPERIENCE ----
    sectionTitle("Work Experience");

    for (const job of cv.work_experience) {
      if (doc.y > 680) doc.addPage();

      const x = doc.x;

      // Company (bold) | Location [Arrangement] - Role (italic)
      doc.font("Poppins-Bold").fontSize(10).fillColor(BLACK).text(job.company, { continued: true });
      doc.font("Poppins").text(` | ${job.location} [${job.arrangement}] - `, { continued: true });
      doc.font("Poppins-Italic").text(job.role);

      // Date — italic
      doc.font("Poppins-Italic").fontSize(10).fillColor(BLACK)
        .text(`${job.start_date} - ${job.end_date} | ${job.duration}`);

      // Domain
      doc.font("Poppins-Bold").fontSize(10).fillColor(BLACK).text("Domain: ", { continued: true });
      doc.font("Poppins").text(job.domain);

      // Project
      doc.font("Poppins-Bold").text("Project: ", { continued: true });
      doc.font("Poppins").text(job.project_name);

      // Project Description
      if (job.project_description) {
        doc.font("Poppins-Bold").text("Project Description: ", { continued: true });
        doc.font("Poppins").text(job.project_description);
      }

      // Responsibilities
      doc.font("Poppins-Bold").fontSize(10).fillColor(BLACK)
        .text("Responsibilities & Achievements:");

      doc.font("Poppins").fontSize(10).fillColor(BLACK);
      for (const resp of job.responsibilities) {
        if (doc.y > 720) doc.addPage();
        doc.text(`     \u25CF   ${resp}`, x, doc.y, { width: pw });
      }

      // Technologies
      doc.font("Poppins-Bold").text("Technologies & Methodologies Used: ", { continued: true });
      doc.font("Poppins").fontSize(10).fillColor(BLACK).text(job.technologies);
      doc.moveDown(0.5);
    }

    // ---- EDUCATION ----
    sectionTitle("Education");
    for (const edu of cv.education) {
      if (doc.y > 720) doc.addPage();
      doc.font("Poppins").fontSize(10).fillColor(BLACK)
        .text(`${edu.institution} | ${edu.location} - `, { continued: true });
      doc.font("Poppins-Italic").text(edu.degree);
      doc.font("Poppins").fontSize(10).fillColor(BLACK)
        .text(`${edu.start_year} - ${edu.end_year}`);
      doc.moveDown(0.2);
    }

    // ---- LANGUAGES ----
    sectionTitle("Languages");
    for (const lang of cv.languages) {
      doc.font("Poppins").fontSize(10).fillColor(BLACK)
        .text(`     \u25CF   ${lang.language} - ${lang.level}`);
    }

    doc.end();
  });
}

function fpLevelLabel(level: string): string {
  const l = level.toLowerCase().trim();
  if (l.includes("native")) return "Native Speaker";
  if (l.includes("c2") || l.includes("proficient")) return "C2 - Proficient";
  if (l.includes("c1") || l.includes("advanced")) return "C1 - Advanced";
  if (l.includes("b2") || l.includes("upper")) return "B2 - Upper-intermediate";
  if (l.includes("b1") || l.includes("intermediate")) return "B1 - Intermediate";
  if (l.includes("a2") || l.includes("elementary") || l.includes("pre")) return "A2";
  if (l.includes("a1") || l.includes("beginner")) return "A1 - Beginner";
  return level;
}

function generateFpPdf(cv: CvData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margins: { top: 50, bottom: 80, left: 60, right: 60 } });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    registerFonts(doc);

    const leftMargin = 60;
    const pw = 475;
    const dateColW = 135;
    const dividerX = leftMargin + dateColW + 4;
    const contentX = dividerX + 14;
    const contentW = pw - dateColW - 18;

    function fpFooter() {
      const fy = doc.page.height - 58;
      doc.save();
      doc.moveTo(leftMargin, fy - 4).lineTo(leftMargin + pw, fy - 4).lineWidth(0.5).strokeColor("#cccccc").stroke();
      doc.font("PTSans-Bold").fontSize(6.5).fillColor(FP_DARK);
      doc.text("A D D R E S S :", leftMargin, fy, { continued: true });
      doc.font("PTSans-Bold").text(" Future Processing S.A.", { continued: false });
      doc.font("PTSans").text("ul. Bojkowska 37A", leftMargin);
      doc.font("PTSans").text("44-100 Gliwice, Poland", leftMargin);

      doc.font("PTSans-Bold").fontSize(6.5).text("M A I L :", leftMargin + pw * 0.42, fy, { continued: true });
      doc.font("PTSans").text("  sales@future-processing.com", { continued: false });
      doc.font("PTSans-Bold").text("W E B :", leftMargin + pw * 0.42, fy + 10, { continued: true });
      doc.font("PTSans").text("  www.future-processing.com", { continued: false });
      doc.font("PTSans-Bold").text("P H O N E :", leftMargin + pw * 0.42, fy + 20, { continued: true });
      doc.font("PTSans").text(" +48 32 461 23 00", { continued: false });
      doc.restore();
    }

    function fpLogo() {
      const logoY = doc.y;
      try {
        const logoPath = path.join(process.cwd(), "public", "fp-logo-full.png");
        doc.image(logoPath, leftMargin, logoY, { height: 28 });
      } catch { /* logo optional */ }
      doc.y = logoY + 42;
    }

    function fpSectionTitle(title: string) {
      if (doc.y > 680) newPage();
      doc.moveDown(0.8);
      doc.font("PTSans-Bold").fontSize(18).fillColor(FP_DARK).text(title.toUpperCase(), leftMargin);
      doc.moveDown(0.35);
    }

    function newPage() {
      fpFooter();
      doc.addPage();
      fpLogo();
    }

    function checkPage() {
      if (doc.y > 680) newPage();
    }

    fpLogo();

    const nameFirst = cv.name.trim().split(/\s+/)[0] || cv.name;
    doc.font("PTSans-Bold").fontSize(30).fillColor(FP_DARK).text(nameFirst.toUpperCase(), leftMargin);
    doc.moveDown(0.2);
    doc.font("PTSans-Bold").fontSize(9).fillColor(FP_DARK)
      .text(cv.title.toUpperCase(), leftMargin, doc.y, { characterSpacing: 2.5 });
    doc.moveDown(0.5);

    const lineY = doc.y;
    doc.moveTo(leftMargin, lineY).lineTo(leftMargin + pw, lineY).lineWidth(0.6).strokeColor(FP_ORANGE).opacity(0.5).stroke();
    doc.opacity(1);
    doc.y = lineY + 12;

    doc.font("PTSans-Italic").fontSize(10.5).fillColor(FP_SUMMARY)
      .text(cv.profile_summary, leftMargin, doc.y, { width: pw, align: "justify" });
    doc.moveDown(0.5);

    // --- SKILLS ---
    fpSectionTitle("Skills");
    doc.fillColor(FP_ORANGE).font("PTSans").fontSize(7).text("■", leftMargin + 12, doc.y + 2, { continued: false });
    const bulletEndX = leftMargin + 24;
    doc.font("PTSans-Bold").fontSize(10.5).fillColor(FP_DARK)
      .text("Technologies, languages & tools: ", bulletEndX, doc.y - 2, { width: pw - 24, continued: true });
    const allSkills = [
      cv.skills.programming_languages, cv.skills.frameworks, cv.skills.libraries,
      cv.skills.databases, cv.skills.cloud, cv.skills.devops,
      cv.skills.development_tools, cv.skills.operating_systems,
      cv.skills.methodologies, cv.skills.architecture,
      cv.skills.testing, cv.skills.other,
    ].filter(Boolean).join(", ");
    doc.font("PTSans").fillColor(FP_DARK).text(allSkills, { align: "justify" });

    // --- LANGUAGES ---
    fpSectionTitle("Languages");
    for (const lang of cv.languages) {
      doc.font("PTSans").fontSize(10.5).fillColor(FP_DARK)
        .text(`■  ${lang.language} – ${fpLevelLabel(lang.level)}`, leftMargin + 12);
    }

    // --- EXPERIENCE ---
    fpSectionTitle("Experience");
    for (const job of cv.work_experience) {
      checkPage();
      const blockStartY = doc.y;

      doc.font("PTSans").fontSize(10.5).fillColor(FP_DARK)
        .text(`${job.start_date} – ${job.end_date}`, leftMargin, blockStartY, { width: dateColW });

      doc.font("PTSans-Bold").fontSize(10.5).fillColor(FP_DARK)
        .text(job.company, contentX, blockStartY, { width: contentW });
      doc.font("PTSans").fontSize(10.5).fillColor(FP_GRAY)
        .text(job.role, contentX, doc.y, { width: contentW });

      doc.font("PTSans-Bold").fontSize(10.5).fillColor(FP_DARK)
        .text("Role and responsibilities:", contentX, doc.y, { width: contentW });

      for (const resp of job.responsibilities) {
        checkPage();
        doc.font("PTSans").fontSize(10).fillColor(FP_DARK)
          .text(`■  ${resp}`, contentX + 14, doc.y, { width: contentW - 14, align: "justify" });
      }

      if (job.technologies) {
        doc.font("PTSans-Bold").fontSize(10.5).fillColor(FP_DARK)
          .text("Technologies: ", contentX, doc.y, { width: contentW, continued: true });
        doc.font("PTSans").text(job.technologies);
      }

      const blockEndY = doc.y;
      doc.save();
      doc.moveTo(dividerX, blockStartY).lineTo(dividerX, blockEndY).lineWidth(2).strokeColor(FP_ORANGE).stroke();
      doc.restore();

      doc.moveDown(0.5);
    }

    // --- EDUCATION ---
    fpSectionTitle("Education");
    for (const edu of cv.education) {
      checkPage();
      const blockStartY = doc.y;

      doc.font("PTSans").fontSize(10.5).fillColor(FP_DARK)
        .text(`${edu.start_year} – ${edu.end_year}`, leftMargin, blockStartY, { width: dateColW });

      doc.font("PTSans-Bold").fontSize(10.5).fillColor(FP_DARK)
        .text(edu.institution, contentX, blockStartY, { width: contentW });

      const field = edu.degree?.replace(/^(Bachelor|Master|PhD|Doctorate|Associate|Diploma)\s*(of|in|'s|degree)?\s*/i, "").trim();
      const degreeWord = edu.degree?.match(/^(Bachelor|Master|PhD|Doctorate|Associate|Diploma)/i)?.[0];

      if (field && field !== edu.degree) {
        doc.font("PTSans-Bold").fontSize(10.5).fillColor(FP_DARK)
          .text("Field: ", contentX, doc.y, { width: contentW, continued: true });
        doc.font("PTSans").text(field);
      }
      if (degreeWord) {
        doc.font("PTSans").fontSize(10.5).fillColor(FP_DARK)
          .text("Degree: ", contentX, doc.y, { width: contentW, continued: true });
        doc.font("PTSans-Bold").text(degreeWord);
      } else if (edu.degree) {
        doc.font("PTSans").fontSize(10.5).fillColor(FP_DARK)
          .text("Degree: ", contentX, doc.y, { width: contentW, continued: true });
        doc.font("PTSans-Bold").text(edu.degree);
      }

      const blockEndY = doc.y;
      doc.save();
      doc.moveTo(dividerX, blockStartY).lineTo(dividerX, blockEndY).lineWidth(2).strokeColor(FP_ORANGE).stroke();
      doc.restore();

      doc.moveDown(0.4);
    }

    fpFooter();
    doc.end();
  });
}

export async function GET(req: NextRequest) {
  return handleDownload(req, null);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  return handleDownload(req, body);
}

async function handleDownload(req: NextRequest, body: { cvData?: CvData; template?: TemplateType } | null) {
  try {
    const fileId = req.nextUrl.searchParams.get("id");
    const template: TemplateType =
      (body?.template as TemplateType) ||
      (req.nextUrl.searchParams.get("template") as TemplateType) ||
      (fileId ? getTemplate(fileId) : "digipal");

    let raw: CvData | undefined;
    if (body?.cvData) {
      raw = body.cvData;
    } else if (fileId) {
      raw = getCvData(fileId) ?? undefined;
    }

    if (!raw) {
      return NextResponse.json({ detail: "CV not found" }, { status: 404 });
    }

    const cvData = coerceCvData(raw);
    const pdfBuffer = template === "fp" ? await generateFpPdf(cvData) : await generatePdf(cvData);
    const name = safeDownloadBasename(cvData.name);
    const suffix = template === "fp" ? "FP_Profile" : "Digipal_Profile";

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${name}_${suffix}.pdf"`,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "PDF generation failed";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
