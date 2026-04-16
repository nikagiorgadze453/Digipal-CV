export type TemplateType = "digipal" | "fp";

export interface CvSkills {
  operating_systems: string;
  programming_languages: string;
  frameworks: string;
  libraries: string;
  development_tools: string;
  databases: string;
  methodologies: string;
  architecture: string;
  testing: string;
  cloud: string;
  devops: string;
  other: string;
}

export interface WorkExperience {
  company: string;
  location: string;
  arrangement: string;
  role: string;
  start_date: string;
  end_date: string;
  duration: string;
  domain: string;
  project_name: string;
  project_description: string;
  responsibilities: string[];
  technologies: string;
}

export interface Education {
  institution: string;
  location: string;
  degree: string;
  start_year: string;
  end_year: string;
}

export interface Language {
  language: string;
  level: string;
}

export interface CvData {
  name: string;
  title: string;
  profile_summary: string;
  domain_experience: string;
  skills: CvSkills;
  work_experience: WorkExperience[];
  education: Education[];
  languages: Language[];
}
