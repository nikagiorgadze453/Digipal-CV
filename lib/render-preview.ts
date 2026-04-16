import { CvData, TemplateType } from "./types";
import { coerceCvData } from "./cv-guards";
import { escapeHtml } from "./escape-html";
import { renderFpPreviewHtml } from "./render-preview-fp";

export function renderPreviewHtmlForTemplate(cv: CvData, template: TemplateType): string {
  if (template === "fp") return renderFpPreviewHtml(cv);
  return renderPreviewHtml(cv);
}

// Colors extracted from the Digipal template PDF
const NAVY = "#070422";
const GREEN = "#51e0ac";
const BLACK = "#000000";

export function renderPreviewHtml(cv: CvData): string {
  const c = coerceCvData(cv);
  const e = escapeHtml;

  const skillRows = [
    ["Operating Systems", c.skills.operating_systems],
    ["Programming Languages", c.skills.programming_languages],
    ["Frameworks", c.skills.frameworks],
    ["Libraries", c.skills.libraries],
    ["Development Tools", c.skills.development_tools],
    ["Data Management & Databases", c.skills.databases],
    ["Software Development Approaches & Methodologies", c.skills.methodologies],
    ["Software Design & Architecture", c.skills.architecture],
    ["Testing Frameworks and Tools:", c.skills.testing],
    ["Cloud Providers & Services", c.skills.cloud],
    ["DevOps and CI/CD Tools", c.skills.devops],
    ["Other Skills", c.skills.other],
  ]
    .filter(([, v]) => v)
    .map(
      ([label, value]) =>
        `<tr><td style="width:36%;font-family:'Poppins',sans-serif;font-weight:400;color:${BLACK};padding:5px 8px;border:1px solid ${BLACK};vertical-align:top;font-size:10pt">${label}</td><td style="font-family:'Poppins',sans-serif;color:${BLACK};padding:5px 8px;border:1px solid ${BLACK};vertical-align:top;font-size:10pt">${e(value)}</td></tr>`
    )
    .join("");

  const jobs = (c.work_experience || [])
    .map(
      (job) => `
    <div style="margin-bottom:16px;font-family:'Poppins',sans-serif">
      <div style="font-size:10pt;color:${BLACK}"><span style="font-weight:700">${e(job.company)}</span> | ${e(job.location)} [${e(job.arrangement)}] - <span style="font-style:italic">${e(job.role)}</span></div>
      <div style="font-size:10pt;color:${BLACK};font-style:italic">${e(job.start_date)} - ${e(job.end_date)} | ${e(job.duration)}</div>
      <div style="font-size:10pt;color:${BLACK}"><span style="font-weight:700">Domain:</span> ${e(job.domain)}</div>
      <div style="font-size:10pt;color:${BLACK}"><span style="font-weight:700">Project:</span> ${e(job.project_name)}</div>
      ${job.project_description ? `<div style="font-size:10pt;color:${BLACK}"><span style="font-weight:700">Project Description:</span> ${e(job.project_description)}</div>` : ""}
      <div style="font-size:10pt;color:${BLACK};font-weight:700">Responsibilities & Achievements:</div>
      <ul style="list-style:none;padding-left:1.25rem;margin:4px 0">
        ${(job.responsibilities || []).map((r) => `<li style="font-size:10pt;color:${BLACK};margin-bottom:2px">&#x25CF;&nbsp; ${e(r)}</li>`).join("")}
      </ul>
      <div style="font-size:10pt;color:${BLACK}"><span style="font-weight:700">Technologies & Methodologies Used:</span> ${e(job.technologies)}</div>
    </div>`
    )
    .join("");

  const eduItems = (c.education || [])
    .map(
      (x) =>
        `<div style="margin-bottom:6px;font-family:'Poppins',sans-serif"><div style="font-size:10pt;color:${BLACK}">${e(x.institution)} | ${e(x.location)} - <span style="font-style:italic">${e(x.degree)}</span></div><div style="font-size:10pt;color:${BLACK}">${e(x.start_year)} - ${e(x.end_year)}</div></div>`
    )
    .join("");

  const langs = (c.languages || [])
    .map(
      (l) =>
        `<li style="font-family:'Poppins',sans-serif;font-size:10pt;color:${BLACK};margin-bottom:2px">&#x25CF;&nbsp; ${e(l.language)} - ${e(l.level)}</li>`
    )
    .join("");

  return `
    <div style="font-family:'Poppins',sans-serif;display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
      <div style="flex:1">
        <h1 style="font-family:'Poppins',sans-serif;font-size:12pt;font-weight:600;color:${NAVY};margin:0 0 2px">${e(c.name)}</h1>
        <div style="font-family:'Poppins',sans-serif;font-size:12pt;font-weight:400;color:${NAVY}">${e(c.title)}</div>
      </div>
      <img src="/digipal-logo.png" alt="Digipal" style="width:40px;height:40px;object-fit:contain">
    </div>
    <div style="font-family:'Poppins',sans-serif;font-size:10pt;color:${BLACK};line-height:1.55;text-align:justify;margin-bottom:4px">${e(c.profile_summary)}</div>
    <div style="font-family:'Poppins',sans-serif;font-size:10pt;color:${BLACK};margin-bottom:0"><span style="font-weight:700">Domain Experience:</span> ${e(c.domain_experience)}</div>

    <div style="font-family:'Poppins',sans-serif;font-size:12pt;font-weight:600;color:${GREEN};text-transform:uppercase;margin-top:18px;margin-bottom:10px">Professional Skills</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:4px">${skillRows}</table>

    <div style="font-family:'Poppins',sans-serif;font-size:12pt;font-weight:600;color:${GREEN};text-transform:uppercase;margin-top:18px;margin-bottom:10px">Work Experience</div>
    ${jobs}

    <div style="font-family:'Poppins',sans-serif;font-size:12pt;font-weight:600;color:${GREEN};text-transform:uppercase;margin-top:18px;margin-bottom:10px">Education</div>
    ${eduItems}

    <div style="font-family:'Poppins',sans-serif;font-size:12pt;font-weight:600;color:${GREEN};text-transform:uppercase;margin-top:18px;margin-bottom:10px">Languages</div>
    <ul style="list-style:none;padding:0">${langs}</ul>
  `;
}
