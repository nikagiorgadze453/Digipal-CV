/** Parse JSON error bodies from API routes (detail vs error vs Anthropic shape). */
export async function readApiErrorDetail(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text) as Record<string, unknown>;
    if (typeof j.detail === "string") return j.detail;
    if (typeof j.error === "string") return j.error;
    const err = j.error;
    if (err && typeof err === "object") {
      const msg = (err as { message?: string }).message;
      if (typeof msg === "string") return msg;
    }
  } catch {
    if (text) return text.slice(0, 500);
  }
  return res.statusText || "Request failed";
}
