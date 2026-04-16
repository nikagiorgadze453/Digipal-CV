import { CvData, TemplateType } from "./types";

interface StoreEntry {
  text: string;
  cvData?: CvData;
  template: TemplateType;
}

const cvStore = new Map<string, StoreEntry>();

export function storeUpload(fileId: string, text: string) {
  cvStore.set(fileId, { text, template: "digipal" });
}

export function getUpload(fileId: string) {
  return cvStore.get(fileId);
}

export function storeCvData(fileId: string, cvData: CvData) {
  const entry = cvStore.get(fileId);
  if (entry) {
    entry.cvData = cvData;
  } else {
    cvStore.set(fileId, { text: "", cvData, template: "digipal" });
  }
}

export function getCvData(fileId: string): CvData | undefined {
  return cvStore.get(fileId)?.cvData;
}

export function storeTemplate(fileId: string, template: TemplateType) {
  const entry = cvStore.get(fileId);
  if (entry) entry.template = template;
}

export function getTemplate(fileId: string): TemplateType {
  return cvStore.get(fileId)?.template ?? "digipal";
}
