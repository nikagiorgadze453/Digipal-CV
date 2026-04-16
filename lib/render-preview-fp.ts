import { CvData } from "./types";
import { coerceCvData } from "./cv-guards";
import { escapeHtml } from "./escape-html";

const DARK = "#333333";
const GRAY = "#7F7F7F";
const SUMMARY_GRAY = "#595959";
const GOLD = "#E36C0A";

// Malleable-FP substitute: Barlow (geometric condensed, same feel)
const FP_FONT = "'Barlow','PT Sans',sans-serif";
const BODY_FONT = "'PT Sans',sans-serif";

function levelLabel(level: string): string {
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

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export function renderFpPreviewHtml(cv: CvData): string {
  const c = coerceCvData(cv);
  const e = escapeHtml;

  const allSkills: string[] = [
    c.skills.programming_languages,
    c.skills.frameworks,
    c.skills.libraries,
    c.skills.databases,
    c.skills.cloud,
    c.skills.devops,
    c.skills.development_tools,
    c.skills.operating_systems,
    c.skills.methodologies,
    c.skills.architecture,
    c.skills.testing,
    c.skills.other,
  ].filter(Boolean);
  const techList = allSkills.join(", ");

  const ob = `<span style="color:${GOLD};margin-right:10px;font-size:8pt;line-height:1;flex-shrink:0">&#9632;</span>`;

  const langs = (c.languages || [])
    .map(
      (l) =>
        `<div style="font-family:${BODY_FONT};font-size:10.5pt;color:${DARK};margin-bottom:6px;padding-left:40px;display:flex;align-items:baseline">${ob}<span>${e(l.language)} – ${e(levelLabel(l.level))}</span></div>`
    )
    .join("");

  const jobs = (c.work_experience || [])
    .map((job) => {
      const resps = (job.responsibilities || [])
        .map(
          (r) =>
            `<div style="font-family:${BODY_FONT};font-size:10pt;color:${DARK};margin-bottom:5px;padding-left:40px;text-align:justify;display:flex;align-items:baseline">${ob}<span>${e(r)}</span></div>`
        )
        .join("");

      return `
      <tr>
        <td style="width:24%;vertical-align:top;padding:10px 14px 18px 0;font-family:${BODY_FONT};font-size:10.5pt;color:${DARK}">${e(job.start_date)} – ${e(job.end_date)}</td>
        <td style="width:76%;vertical-align:top;padding:10px 0 18px 20px;border-left:2px solid ${GOLD}">
          <div style="font-family:${BODY_FONT};font-size:10.5pt;font-weight:700;color:${DARK}">${e(job.company)}</div>
          <div style="font-family:${BODY_FONT};font-size:10.5pt;color:${GRAY}">${e(job.role)}</div>
          <div style="font-family:${BODY_FONT};font-size:10.5pt;font-weight:700;color:${DARK};margin-top:4px">Role and responsibilities:</div>
          ${resps}
          ${job.technologies ? `<div style="font-family:${BODY_FONT};font-size:10.5pt;color:${DARK};margin-top:6px"><span style="font-weight:700">Technologies:</span> ${e(job.technologies)}</div>` : ""}
        </td>
      </tr>`;
    })
    .join("");

  const eduItems = (c.education || [])
    .map((x) => {
      const field = x.degree?.replace(/^(Bachelor|Master|PhD|Doctorate|Associate|Diploma)\s*(of|in|'s|degree)?\s*/i, "").trim();
      const degreeWord = x.degree?.match(/^(Bachelor|Master|PhD|Doctorate|Associate|Diploma)/i)?.[0] || x.degree;
      return `
      <tr>
        <td style="width:24%;vertical-align:top;padding:8px 14px 14px 0;font-family:${BODY_FONT};font-size:10.5pt;color:${DARK}">${e(x.start_year)} – ${e(x.end_year)}</td>
        <td style="width:76%;vertical-align:top;padding:8px 0 14px 20px;border-left:2px solid ${GOLD}">
          <div style="font-family:${BODY_FONT};font-size:10.5pt;font-weight:700;color:${DARK}">${e(x.institution)}</div>
          ${field && field !== x.degree ? `<div style="font-family:${BODY_FONT};font-size:10.5pt;color:${DARK}"><span style="font-weight:700">Field:</span> ${e(field)}</div>` : ""}
          <div style="font-family:${BODY_FONT};font-size:10.5pt;color:${DARK}"><span style="font-weight:700">Degree:</span> ${e(degreeWord || x.degree)}</div>
        </td>
      </tr>`;
    })
    .join("");

  const sectionHeading = (title: string) =>
    `<div style="font-family:${FP_FONT};font-size:20pt;font-weight:700;color:${DARK};text-transform:uppercase;margin-top:36px;margin-bottom:14px;letter-spacing:1px">${e(title)}</div>`;

  return `
    <div style="font-family:${BODY_FONT};background:#FFFFFF;color:${DARK};padding:0;position:relative">
      <!-- FP Logo (full image) -->
      <div style="margin-bottom:44px;padding-top:4px">
        <img src="/fp-logo-full.png" alt="Future Processing" style="height:42px;object-fit:contain">
      </div>

      <!-- Name (first name only, Malleable-FP substitute: Barlow) -->
      <div style="font-family:${FP_FONT};font-size:38pt;font-weight:800;color:${DARK};text-transform:uppercase;margin-bottom:8px;letter-spacing:1px">${e(firstName(c.name))}</div>

      <!-- Title (Malleable-FP, spaced) -->
      <div style="font-family:${FP_FONT};font-size:11pt;font-weight:600;color:#404040;letter-spacing:3.5px;text-transform:uppercase;margin-bottom:18px">${e(c.title).toUpperCase()}</div>

      <!-- Gold separator line -->
      <div style="height:1px;background:${GOLD};margin-bottom:18px"></div>

      <!-- Summary (italic, gray, justified) -->
      <div style="font-family:${BODY_FONT};font-size:10.5pt;color:${SUMMARY_GRAY};font-style:italic;line-height:1.65;text-align:justify;margin-bottom:24px">${e(c.profile_summary)}</div>

      <!-- Skills -->
      ${sectionHeading("Skills")}
      <div style="font-family:${BODY_FONT};font-size:10.5pt;color:${DARK};margin-bottom:4px;padding-left:40px;text-align:justify;display:flex;align-items:baseline">${ob}<span><span style="font-weight:700">Technologies, languages &amp; tools:</span> ${e(techList)}</span></div>

      <!-- Languages -->
      ${sectionHeading("Languages")}
      <div style="margin-bottom:4px">${langs}</div>

      <!-- Experience -->
      ${sectionHeading("Experience")}
      <table style="width:100%;border-collapse:collapse">${jobs}</table>

      <!-- Education -->
      ${sectionHeading("Education")}
      <table style="width:100%;border-collapse:collapse">${eduItems}</table>

      <!-- Footer -->
      <div style="margin-top:36px;padding-top:12px;border-top:1px solid #ddd;font-family:${BODY_FONT};font-size:7.5pt;color:${DARK};display:flex;justify-content:space-between">
        <div>
          <div><span style="letter-spacing:3px;font-weight:700">ADDRESS:</span> <strong>Future Processing S.A.</strong></div>
          <div>ul. Bojkowska 37A</div>
          <div>44-100 Gliwice, Poland</div>
        </div>
        <div>
          <div><span style="letter-spacing:3px;font-weight:700">MAIL:</span> sales@future-processing.com</div>
          <div><span style="letter-spacing:3px;font-weight:700">WEB:</span> www.future-processing.com</div>
          <div><span style="letter-spacing:3px;font-weight:700">PHONE:</span> +48 32 461 23 00</div>
        </div>
      </div>
    </div>
  `;
}
