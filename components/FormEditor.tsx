"use client";

import { useState } from "react";
import { CvData } from "@/lib/types";
import { readApiErrorDetail } from "@/lib/api-error";

interface Props {
  cvData: CvData;
  fileId: string;
  onUpdate: (cv: CvData, html: string) => void;
  onClose: () => void;
  showToast: (msg: string, error?: boolean) => void;
}

const SKILL_LABELS: Record<string, string> = {
  operating_systems: "Operating Systems",
  programming_languages: "Programming Languages",
  frameworks: "Frameworks",
  libraries: "Libraries",
  development_tools: "Development Tools",
  databases: "Data Management & Databases",
  methodologies: "Methodologies",
  architecture: "Architecture",
  testing: "Testing",
  cloud: "Cloud Services",
  devops: "DevOps & CI/CD",
  other: "Other Skills",
};

export default function FormEditor({ cvData: initial, fileId, onUpdate, onClose, showToast }: Props) {
  const [data, setData] = useState<CvData>(JSON.parse(JSON.stringify(initial)));

  const set = (path: string, value: string | string[]) => {
    setData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const parts = path.split(".");
      let obj: Record<string, unknown> = next;
      for (let i = 0; i < parts.length - 1; i++) {
        obj = obj[parts[i]] as Record<string, unknown>;
      }
      obj[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const addJob = () => {
    setData((prev) => ({
      ...prev,
      work_experience: [
        ...prev.work_experience,
        { company: "", location: "", arrangement: "Remote", role: "", start_date: "", end_date: "Present", duration: "", domain: "", project_name: "", project_description: "", responsibilities: [""], technologies: "" },
      ],
    }));
  };

  const removeJob = (idx: number) => {
    setData((prev) => ({ ...prev, work_experience: prev.work_experience.filter((_, i) => i !== idx) }));
  };

  const addEdu = () => {
    setData((prev) => ({ ...prev, education: [...prev.education, { institution: "", location: "", degree: "", start_year: "", end_year: "" }] }));
  };

  const removeEdu = (idx: number) => {
    setData((prev) => ({ ...prev, education: prev.education.filter((_, i) => i !== idx) }));
  };

  const addLang = () => {
    setData((prev) => ({ ...prev, languages: [...prev.languages, { language: "", level: "" }] }));
  };

  const removeLang = (idx: number) => {
    setData((prev) => ({ ...prev, languages: prev.languages.filter((_, i) => i !== idx) }));
  };

  const save = async () => {
    const fd = new FormData();
    fd.append("file_id", fileId);
    fd.append("cv_data", JSON.stringify(data));
    try {
      const res = await fetch("/api/update", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await readApiErrorDetail(res));
      const result = await res.json();
      onUpdate(result.cv_data, result.preview_html);
      onClose();
      showToast("Profile updated!");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Update failed", true);
    }
  };

  const skillKeys = Object.keys(SKILL_LABELS);

  return (
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-content">
        <div className="modal-header">
          <h3>Edit Profile Data</h3>
          <button className="btn-icon" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="form-editor">
          {/* Basic */}
          <div className="form-section">
            <div className="form-section-title">Basic Information</div>
            <div className="form-row">
              <div className="form-field"><label>Full Name</label><input value={data.name} onChange={(e) => set("name", e.target.value)} /></div>
              <div className="form-field"><label>Title</label><input value={data.title} onChange={(e) => set("title", e.target.value)} /></div>
            </div>
            <div className="form-field"><label>Profile Summary</label><textarea rows={3} value={data.profile_summary} onChange={(e) => set("profile_summary", e.target.value)} /></div>
            <div className="form-field"><label>Domain Experience</label><input value={data.domain_experience} onChange={(e) => set("domain_experience", e.target.value)} /></div>
          </div>

          {/* Skills */}
          <div className="form-section">
            <div className="form-section-title">Professional Skills</div>
            {Array.from({ length: Math.ceil(skillKeys.length / 2) }, (_, i) => (
              <div className="form-row" key={i}>
                {skillKeys.slice(i * 2, i * 2 + 2).map((k) => (
                  <div className="form-field" key={k}>
                    <label>{SKILL_LABELS[k]}</label>
                    <input value={(data.skills as unknown as Record<string, string>)[k] || ""} onChange={(e) => set(`skills.${k}`, e.target.value)} />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Work Experience */}
          <div className="form-section">
            <div className="form-section-title">Work Experience</div>
            {data.work_experience.map((job, idx) => (
              <div className="job-block" key={idx}>
                <div className="job-block-header">
                  <span className="job-block-title">Position #{idx + 1}</span>
                  <button className="btn-remove" onClick={() => removeJob(idx)}>Remove</button>
                </div>
                <div className="form-row">
                  <div className="form-field"><label>Company</label><input value={job.company} onChange={(e) => set(`work_experience.${idx}.company`, e.target.value)} /></div>
                  <div className="form-field"><label>Role</label><input value={job.role} onChange={(e) => set(`work_experience.${idx}.role`, e.target.value)} /></div>
                </div>
                <div className="form-row">
                  <div className="form-field"><label>Location</label><input value={job.location} onChange={(e) => set(`work_experience.${idx}.location`, e.target.value)} /></div>
                  <div className="form-field"><label>Arrangement</label><input value={job.arrangement} onChange={(e) => set(`work_experience.${idx}.arrangement`, e.target.value)} /></div>
                </div>
                <div className="form-row">
                  <div className="form-field"><label>Start Date</label><input value={job.start_date} onChange={(e) => set(`work_experience.${idx}.start_date`, e.target.value)} /></div>
                  <div className="form-field"><label>End Date</label><input value={job.end_date} onChange={(e) => set(`work_experience.${idx}.end_date`, e.target.value)} /></div>
                  <div className="form-field"><label>Duration</label><input value={job.duration} onChange={(e) => set(`work_experience.${idx}.duration`, e.target.value)} /></div>
                </div>
                <div className="form-row">
                  <div className="form-field"><label>Domain</label><input value={job.domain} onChange={(e) => set(`work_experience.${idx}.domain`, e.target.value)} /></div>
                  <div className="form-field"><label>Project Name</label><input value={job.project_name} onChange={(e) => set(`work_experience.${idx}.project_name`, e.target.value)} /></div>
                </div>
                <div className="form-field"><label>Project Description</label><textarea rows={2} value={job.project_description} onChange={(e) => set(`work_experience.${idx}.project_description`, e.target.value)} /></div>
                <div className="form-field">
                  <label>Responsibilities (one per line)</label>
                  <textarea rows={5} value={job.responsibilities.join("\n")} onChange={(e) => set(`work_experience.${idx}.responsibilities`, e.target.value.split("\n"))} />
                </div>
                <div className="form-field"><label>Technologies</label><textarea rows={2} value={job.technologies} onChange={(e) => set(`work_experience.${idx}.technologies`, e.target.value)} /></div>
              </div>
            ))}
            <button className="btn-add" onClick={addJob}>+ Add Work Experience</button>
          </div>

          {/* Education */}
          <div className="form-section">
            <div className="form-section-title">Education</div>
            {data.education.map((edu, idx) => (
              <div className="job-block" key={idx}>
                <div className="job-block-header">
                  <span className="job-block-title">Education #{idx + 1}</span>
                  <button className="btn-remove" onClick={() => removeEdu(idx)}>Remove</button>
                </div>
                <div className="form-row">
                  <div className="form-field"><label>Institution</label><input value={edu.institution} onChange={(e) => set(`education.${idx}.institution`, e.target.value)} /></div>
                  <div className="form-field"><label>Location</label><input value={edu.location} onChange={(e) => set(`education.${idx}.location`, e.target.value)} /></div>
                </div>
                <div className="form-row">
                  <div className="form-field"><label>Degree</label><input value={edu.degree} onChange={(e) => set(`education.${idx}.degree`, e.target.value)} /></div>
                  <div className="form-field"><label>Start Year</label><input value={edu.start_year} onChange={(e) => set(`education.${idx}.start_year`, e.target.value)} /></div>
                  <div className="form-field"><label>End Year</label><input value={edu.end_year} onChange={(e) => set(`education.${idx}.end_year`, e.target.value)} /></div>
                </div>
              </div>
            ))}
            <button className="btn-add" onClick={addEdu}>+ Add Education</button>
          </div>

          {/* Languages */}
          <div className="form-section">
            <div className="form-section-title">Languages</div>
            {data.languages.map((lang, idx) => (
              <div className="form-row" key={idx}>
                <div className="form-field"><label>Language</label><input value={lang.language} onChange={(e) => set(`languages.${idx}.language`, e.target.value)} /></div>
                <div className="form-field"><label>Level</label><input value={lang.level} onChange={(e) => set(`languages.${idx}.level`, e.target.value)} /></div>
                <button className="btn-remove" style={{ alignSelf: "flex-end", marginBottom: 4 }} onClick={() => removeLang(idx)}>Remove</button>
              </div>
            ))}
            <button className="btn-add" onClick={addLang}>+ Add Language</button>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}
