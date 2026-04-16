import { NextRequest, NextResponse } from "next/server";
import { getCvData, getTemplate } from "@/lib/storage";
import { CvData, TemplateType } from "@/lib/types";
import { coerceCvData } from "@/lib/cv-guards";
import fs from "fs";
import path from "path";

function safeDownloadBasename(name: string): string {
  const s = name.replace(/[^\w\s-]+/g, "").replace(/\s+/g, "_").slice(0, 80);
  return s || "CV";
}

function readLogoBuffer(filename: string): Buffer | null {
  try {
    return fs.readFileSync(path.join(process.cwd(), "public", filename));
  } catch { return null; }
}

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  Footer,
} from "docx";

const NAVY = "070422";
const GREEN = "51e0ac";
const BLACK = "000000";

function generateDocx(cv: CvData): Promise<Buffer> {
  const sectionTitle = (title: string): Paragraph =>
    new Paragraph({
      spacing: { before: 300, after: 150 },
      children: [
        new TextRun({
          text: title.toUpperCase(),
          bold: true,
          size: 24,
          color: GREEN,
          font: "Poppins",
        }),
      ],
    });

  // --- Skills table rows ---
  const skillLabels: [string, string][] = [
    ["Operating Systems", cv.skills.operating_systems],
    ["Programming Languages", cv.skills.programming_languages],
    ["Frameworks", cv.skills.frameworks],
    ["Libraries", cv.skills.libraries],
    ["Development Tools", cv.skills.development_tools],
    ["Data Management & Databases", cv.skills.databases],
    ["Software Development Approaches & Methodologies", cv.skills.methodologies],
    ["Software Design & Architecture", cv.skills.architecture],
    ["Testing Frameworks and Tools", cv.skills.testing],
    ["Cloud Providers & Services", cv.skills.cloud],
    ["DevOps and CI/CD Tools", cv.skills.devops],
    ["Other Skills", cv.skills.other],
  ];

  const border = { style: BorderStyle.SINGLE, size: 1, color: BLACK };
  const cellBorders = { top: border, bottom: border, left: border, right: border };

  const skillRows = skillLabels
    .filter(([, value]) => value)
    .map(
      ([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              borders: cellBorders,
              width: { size: 36, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: label, size: 20, font: "Poppins", color: BLACK }),
                  ],
                }),
              ],
            }),
            new TableCell({
              borders: cellBorders,
              width: { size: 64, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: value, size: 20, font: "Poppins", color: BLACK }),
                  ],
                }),
              ],
            }),
          ],
        })
    );

  // --- Work experience paragraphs ---
  const workParagraphs: Paragraph[] = [];
  for (const job of cv.work_experience) {
    // Company | Location [Arrangement] - Role
    workParagraphs.push(
      new Paragraph({
        spacing: { before: 200 },
        children: [
          new TextRun({ text: job.company, bold: true, size: 20, font: "Poppins", color: BLACK }),
          new TextRun({ text: ` | ${job.location} [${job.arrangement}] - `, size: 20, font: "Poppins", color: BLACK }),
          new TextRun({ text: job.role, italics: true, size: 20, font: "Poppins", color: BLACK }),
        ],
      })
    );

    // Dates
    workParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${job.start_date} - ${job.end_date} | ${job.duration}`,
            italics: true,
            size: 20,
            font: "Poppins",
            color: BLACK,
          }),
        ],
      })
    );

    // Domain
    workParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Domain: ", bold: true, size: 20, font: "Poppins", color: BLACK }),
          new TextRun({ text: job.domain, size: 20, font: "Poppins", color: BLACK }),
        ],
      })
    );

    // Project
    workParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Project: ", bold: true, size: 20, font: "Poppins", color: BLACK }),
          new TextRun({ text: job.project_name, size: 20, font: "Poppins", color: BLACK }),
        ],
      })
    );

    // Project Description
    if (job.project_description) {
      workParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Project Description: ", bold: true, size: 20, font: "Poppins", color: BLACK }),
            new TextRun({ text: job.project_description, size: 20, font: "Poppins", color: BLACK }),
          ],
        })
      );
    }

    // Responsibilities heading
    workParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Responsibilities & Achievements:", bold: true, size: 20, font: "Poppins", color: BLACK }),
        ],
      })
    );

    // Responsibility bullets
    for (const resp of job.responsibilities) {
      workParagraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({ text: resp, size: 20, font: "Poppins", color: BLACK }),
          ],
        })
      );
    }

    // Technologies
    workParagraphs.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({ text: "Technologies & Methodologies Used: ", bold: true, size: 20, font: "Poppins", color: BLACK }),
          new TextRun({ text: job.technologies, size: 20, font: "Poppins", color: BLACK }),
        ],
      })
    );
  }

  // --- Education paragraphs ---
  const educationParagraphs: Paragraph[] = cv.education.map(
    (edu) =>
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: `${edu.institution} | ${edu.location} - `, size: 20, font: "Poppins", color: BLACK }),
          new TextRun({ text: edu.degree, italics: true, size: 20, font: "Poppins", color: BLACK }),
          new TextRun({ text: `  ${edu.start_year} - ${edu.end_year}`, size: 20, font: "Poppins", color: BLACK }),
        ],
      })
  );

  // --- Language paragraphs ---
  const languageParagraphs: Paragraph[] = cv.languages.map(
    (lang) =>
      new Paragraph({
        bullet: { level: 0 },
        children: [
          new TextRun({ text: `${lang.language} - ${lang.level}`, size: 20, font: "Poppins", color: BLACK }),
        ],
      })
  );

  const digipalLogo = readLogoBuffer("digipal-logo.png");

  // Logo paragraph (top-right via a right-aligned paragraph)
  const logoParagraph = digipalLogo
    ? new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 200 },
        children: [
          new ImageRun({
            data: digipalLogo,
            transformation: { width: 60, height: 60 },
            type: "png",
          }),
        ],
      })
    : new Paragraph({ children: [] });

  // --- Assemble document ---
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 860, right: 860 },
          },
        },
        children: [
          logoParagraph,
          // Name
          new Paragraph({
            spacing: { before: 0, after: 60 },
            children: [
              new TextRun({ text: cv.name, bold: true, size: 28, color: NAVY, font: "Poppins" }),
            ],
          }),
          // Title
          new Paragraph({
            spacing: { after: 160 },
            children: [
              new TextRun({ text: cv.title, size: 24, color: NAVY, font: "Poppins" }),
            ],
          }),
          // Profile Summary
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 120 },
            children: [
              new TextRun({ text: cv.profile_summary, size: 20, color: BLACK, font: "Poppins" }),
            ],
          }),
          // Domain Experience
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: "Domain Experience: ", bold: true, size: 20, font: "Poppins", color: BLACK }),
              new TextRun({ text: cv.domain_experience, size: 20, font: "Poppins", color: BLACK }),
            ],
          }),
          // Professional Skills
          sectionTitle("Professional Skills"),
          new Paragraph({ spacing: { after: 80 }, children: [] }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: skillRows,
          }),
          // Work Experience
          sectionTitle("Work Experience"),
          ...workParagraphs,
          // Education
          sectionTitle("Education"),
          ...educationParagraphs,
          // Languages
          sectionTitle("Languages"),
          ...languageParagraphs,
        ],
      },
    ],
  });

  return Packer.toBuffer(doc) as Promise<Buffer>;
}

const FP_DARK_DOCX = "333333";
const FP_GRAY_DOCX = "7F7F7F";
const FP_SUMMARY_DOCX = "595959";
const FP_ORANGE_DOCX = "E36C0A";

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

function generateFpDocx(cv: CvData): Promise<Buffer> {
  const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
  const orangeLeftBorder = {
    top: noBorder,
    bottom: noBorder,
    left: { style: BorderStyle.SINGLE, size: 6, color: FP_ORANGE_DOCX },
    right: noBorder,
  };

  const fpSectionTitle = (title: string): Paragraph =>
    new Paragraph({
      spacing: { before: 360, after: 160 },
      children: [
        new TextRun({
          text: title.toUpperCase(),
          bold: true,
          size: 36,
          color: FP_DARK_DOCX,
          font: "PT Sans",
        }),
      ],
    });

  const allSkills = [
    cv.skills.programming_languages, cv.skills.frameworks, cv.skills.libraries,
    cv.skills.databases, cv.skills.cloud, cv.skills.devops,
    cv.skills.development_tools, cv.skills.operating_systems,
    cv.skills.methodologies, cv.skills.architecture,
    cv.skills.testing, cv.skills.other,
  ].filter(Boolean).join(", ");

  const langParagraphs: Paragraph[] = cv.languages.map(
    (lang) =>
      new Paragraph({
        spacing: { after: 40 },
        indent: { left: 240 },
        children: [
          new TextRun({ text: "■  ", size: 14, font: "PT Sans", color: FP_ORANGE_DOCX }),
          new TextRun({ text: `${lang.language} – ${fpLevelLabel(lang.level)}`, size: 21, font: "PT Sans", color: FP_DARK_DOCX }),
        ],
      })
  );

  const expRows: TableRow[] = cv.work_experience.map((job) => {
    const respParas = job.responsibilities.map(
      (r) =>
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 30 },
          indent: { left: 360 },
          children: [
            new TextRun({ text: "■  ", size: 14, font: "PT Sans", color: FP_ORANGE_DOCX }),
            new TextRun({ text: r, size: 20, font: "PT Sans", color: FP_DARK_DOCX }),
          ],
        })
    );

    const contentChildren: Paragraph[] = [
      new Paragraph({
        children: [
          new TextRun({ text: job.company, bold: true, size: 21, font: "PT Sans", color: FP_DARK_DOCX }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: job.role, size: 21, font: "PT Sans", color: FP_GRAY_DOCX }),
        ],
      }),
      new Paragraph({
        spacing: { before: 20 },
        children: [
          new TextRun({ text: "Role and responsibilities:", bold: true, size: 21, font: "PT Sans", color: FP_DARK_DOCX }),
        ],
      }),
      ...respParas,
    ];

    if (job.technologies) {
      contentChildren.push(
        new Paragraph({
          spacing: { before: 40 },
          children: [
            new TextRun({ text: "Technologies: ", bold: true, size: 21, font: "PT Sans", color: FP_DARK_DOCX }),
            new TextRun({ text: job.technologies, size: 21, font: "PT Sans", color: FP_DARK_DOCX }),
          ],
        })
      );
    }

    return new TableRow({
      children: [
        new TableCell({
          borders: noBorders,
          width: { size: 26, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: `${job.start_date} – ${job.end_date}`, size: 21, font: "PT Sans", color: FP_DARK_DOCX }),
              ],
            }),
          ],
        }),
        new TableCell({
          borders: orangeLeftBorder,
          width: { size: 74, type: WidthType.PERCENTAGE },
          children: contentChildren,
        }),
      ],
    });
  });

  const eduRows: TableRow[] = cv.education.map((edu) => {
    const field = edu.degree?.replace(/^(Bachelor|Master|PhD|Doctorate|Associate|Diploma)\s*(of|in|'s|degree)?\s*/i, "").trim();
    const degreeWord = edu.degree?.match(/^(Bachelor|Master|PhD|Doctorate|Associate|Diploma)/i)?.[0];

    const contentChildren: Paragraph[] = [
      new Paragraph({
        children: [
          new TextRun({ text: edu.institution, bold: true, size: 21, font: "PT Sans", color: FP_DARK_DOCX }),
        ],
      }),
    ];

    if (field && field !== edu.degree) {
      contentChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Field: ", bold: true, size: 21, font: "PT Sans", color: FP_DARK_DOCX }),
            new TextRun({ text: field, size: 21, font: "PT Sans", color: FP_DARK_DOCX }),
          ],
        })
      );
    }

    contentChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Degree: ", size: 21, font: "PT Sans", color: FP_DARK_DOCX }),
          new TextRun({ text: degreeWord || edu.degree, bold: true, size: 21, font: "PT Sans", color: FP_DARK_DOCX }),
        ],
      })
    );

    return new TableRow({
      children: [
        new TableCell({
          borders: noBorders,
          width: { size: 26, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: `${edu.start_year} – ${edu.end_year}`, size: 21, font: "PT Sans", color: FP_DARK_DOCX }),
              ],
            }),
          ],
        }),
        new TableCell({
          borders: orangeLeftBorder,
          width: { size: 74, type: WidthType.PERCENTAGE },
          children: contentChildren,
        }),
      ],
    });
  });

  const footerBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const fpLogo = readLogoBuffer("fp-logo-full.png");

  // FP logo paragraph — the logo is 1000x242px, display at ~250x60pt
  const fpLogoParagraph = fpLogo
    ? new Paragraph({
        spacing: { after: 280 },
        children: [
          new ImageRun({
            data: fpLogo,
            transformation: { width: 220, height: 53 },
            type: "png",
          }),
        ],
      })
    : new Paragraph({ children: [] });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 1000, bottom: 1320, left: 1152, right: 1152 } },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                border: { top: footerBorder },
                spacing: { before: 80 },
                children: [
                  new TextRun({ text: "A D D R E S S :  ", bold: true, size: 13, font: "PT Sans", color: FP_DARK_DOCX }),
                  new TextRun({ text: "Future Processing S.A.          ", bold: true, size: 13, font: "PT Sans", color: FP_DARK_DOCX }),
                  new TextRun({ text: "M A I L :   ", bold: true, size: 13, font: "PT Sans", color: FP_DARK_DOCX }),
                  new TextRun({ text: "sales@future-processing.com", size: 13, font: "PT Sans", color: FP_DARK_DOCX }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "ul. Bojkowska 37A                             ", size: 13, font: "PT Sans", color: FP_DARK_DOCX }),
                  new TextRun({ text: "W E B :   ", bold: true, size: 13, font: "PT Sans", color: FP_DARK_DOCX }),
                  new TextRun({ text: "www.future-processing.com", size: 13, font: "PT Sans", color: FP_DARK_DOCX }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "44-100 Gliwice, Poland                    ", size: 13, font: "PT Sans", color: FP_DARK_DOCX }),
                  new TextRun({ text: "P H O N E :", bold: true, size: 13, font: "PT Sans", color: FP_DARK_DOCX }),
                  new TextRun({ text: " +48 32 461 23 00", size: 13, font: "PT Sans", color: FP_DARK_DOCX }),
                ],
              }),
            ],
          }),
        },
        children: [
          fpLogoParagraph,
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: (cv.name.trim().split(/\s+/)[0] || cv.name).toUpperCase(), bold: true, size: 60, color: FP_DARK_DOCX, font: "PT Sans" }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({ text: cv.title.toUpperCase(), bold: true, size: 18, color: FP_DARK_DOCX, font: "PT Sans", characterSpacing: 120 }),
            ],
          }),
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: FP_ORANGE_DOCX } },
            spacing: { after: 100 },
            children: [],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
            children: [
              new TextRun({ text: cv.profile_summary, italics: true, size: 21, color: FP_SUMMARY_DOCX, font: "PT Sans" }),
            ],
          }),
          fpSectionTitle("Skills"),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            indent: { left: 240 },
            children: [
              new TextRun({ text: "■  ", size: 14, font: "PT Sans", color: FP_ORANGE_DOCX }),
              new TextRun({ text: "Technologies, languages & tools: ", bold: true, size: 21, font: "PT Sans", color: FP_DARK_DOCX }),
              new TextRun({ text: allSkills, size: 21, font: "PT Sans", color: FP_DARK_DOCX }),
            ],
          }),
          fpSectionTitle("Languages"),
          ...langParagraphs,
          fpSectionTitle("Experience"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: expRows,
          }),
          fpSectionTitle("Education"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: eduRows,
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc) as Promise<Buffer>;
}

export async function GET(req: NextRequest) {
  return handleDocxDownload(req, null);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  return handleDocxDownload(req, body);
}

async function handleDocxDownload(req: NextRequest, body: { cvData?: CvData; template?: TemplateType } | null) {
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
    const docxBuffer = template === "fp" ? await generateFpDocx(cvData) : await generateDocx(cvData);
    const name = safeDownloadBasename(cvData.name);
    const suffix = template === "fp" ? "FP_Profile" : "Digipal_Profile";

    return new NextResponse(new Uint8Array(docxBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${name}_${suffix}.docx"`,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DOCX generation failed";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
