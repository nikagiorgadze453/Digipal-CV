import { CvData, CvSkills, WorkExperience, Education, Language } from "./types";

const EMPTY_SKILLS: CvSkills = {
  operating_systems: "",
  programming_languages: "",
  frameworks: "",
  libraries: "",
  development_tools: "",
  databases: "",
  methodologies: "",
  architecture: "",
  testing: "",
  cloud: "",
  devops: "",
  other: "",
};

function coerceSkills(raw: unknown): CvSkills {
  if (!raw || typeof raw !== "object") return { ...EMPTY_SKILLS };
  const s = raw as Record<string, unknown>;
  const str = (k: keyof CvSkills) => String(s[k] ?? "");
  return {
    operating_systems: str("operating_systems"),
    programming_languages: str("programming_languages"),
    frameworks: str("frameworks"),
    libraries: str("libraries"),
    development_tools: str("development_tools"),
    databases: str("databases"),
    methodologies: str("methodologies"),
    architecture: str("architecture"),
    testing: str("testing"),
    cloud: str("cloud"),
    devops: str("devops"),
    other: str("other"),
  };
}

function coerceJob(raw: unknown): WorkExperience {
  const j = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const resp = j.responsibilities;
  const responsibilities = Array.isArray(resp)
    ? resp.map((x) => String(x))
    : typeof resp === "string"
      ? [resp]
      : [];
  return {
    company: String(j.company ?? ""),
    location: String(j.location ?? ""),
    arrangement: String(j.arrangement ?? "Remote"),
    role: String(j.role ?? ""),
    start_date: String(j.start_date ?? ""),
    end_date: String(j.end_date ?? ""),
    duration: String(j.duration ?? ""),
    domain: String(j.domain ?? ""),
    project_name: String(j.project_name ?? ""),
    project_description: String(j.project_description ?? ""),
    responsibilities,
    technologies: String(j.technologies ?? ""),
  };
}

function coerceEdu(raw: unknown): Education {
  const e = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    institution: String(e.institution ?? ""),
    location: String(e.location ?? ""),
    degree: String(e.degree ?? ""),
    start_year: String(e.start_year ?? ""),
    end_year: String(e.end_year ?? ""),
  };
}

function coerceLang(raw: unknown): Language {
  const l = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    language: String(l.language ?? ""),
    level: String(l.level ?? ""),
  };
}

/** Normalizes AI/editor JSON so preview/PDF/DOCX never crash on missing fields. */
export function coerceCvData(raw: unknown): CvData {
  const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const we = d.work_experience;
  const ed = d.education;
  const lg = d.languages;
  return {
    name: String(d.name ?? ""),
    title: String(d.title ?? ""),
    profile_summary: String(d.profile_summary ?? ""),
    domain_experience: String(d.domain_experience ?? ""),
    skills: coerceSkills(d.skills),
    work_experience: Array.isArray(we) ? we.map(coerceJob) : [],
    education: Array.isArray(ed) ? ed.map(coerceEdu) : [],
    languages: Array.isArray(lg) ? lg.map(coerceLang) : [],
  };
}
