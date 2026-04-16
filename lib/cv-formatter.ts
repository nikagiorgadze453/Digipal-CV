import Anthropic from "@anthropic-ai/sdk";
import { CvData } from "./types";
import { normalizeAnthropicApiKey } from "./api-key";
import { coerceCvData } from "./cv-guards";

// Cursor IDE may set these and break direct API calls — clear before constructing the client.
delete process.env.ANTHROPIC_BASE_URL;
delete process.env.ANTHROPIC_AUTH_TOKEN;

const SYSTEM_PROMPT = `You are a professional CV formatting assistant. Your job is to take raw CV text and restructure it into a specific company profile template format.

You must output ONLY valid JSON (no markdown, no explanation, no extra text) matching this exact structure. Fill every field from the CV data. If information is not available, use reasonable defaults or leave as empty string.

IMPORTANT RULES:
- Profile summary should be around 70 words, professionally written in third person
- Calculate duration for each work experience (X years Y months)
- Dates should be in MM/YYYY format
- Each work experience should have 4-6 bullet points for responsibilities & achievements
- Bullet points should start with action verbs and be specific, measurable where possible
- Categorize skills properly into the right sections
- For work arrangement, infer from context (default to "Remote" if unclear)
- Domain should be inferred from project context (e.g., E-commerce, Banking, FinTech)
- Project descriptions should be 1-2 sentences describing the aim
- Technologies should be listed as comma-separated values

Output this JSON structure:
{
  "name": "Full Name",
  "title": "Professional Title (e.g. Senior Data Engineer)",
  "profile_summary": "70-word professional summary in third person",
  "domain_experience": "Comma-separated domains (e.g. E-commerce, Banking, FinTech)",
  "skills": {
    "operating_systems": "e.g. Linux, macOS, Windows",
    "programming_languages": "e.g. Python, Java, SQL",
    "frameworks": "e.g. Apache Spark, dbt",
    "libraries": "e.g. PySpark, Pandas",
    "development_tools": "e.g. Git, Docker, Terraform",
    "databases": "e.g. PostgreSQL, Snowflake, Redis",
    "methodologies": "e.g. Agile, ETL/ELT Pipelines",
    "architecture": "e.g. Microservices, Event-driven",
    "testing": "e.g. pytest, dbt tests",
    "cloud": "e.g. AWS (S3, EC2, Lambda), GCP",
    "devops": "e.g. Terraform, Jenkins, GitHub Actions",
    "other": "e.g. Real-time analytics, Monitoring"
  },
  "work_experience": [
    {
      "company": "Company Name",
      "location": "City, Country",
      "arrangement": "Remote/On-site/Hybrid",
      "role": "Job Title",
      "start_date": "MM/YYYY",
      "end_date": "MM/YYYY or Present",
      "duration": "X years Y months",
      "domain": "Industry domain",
      "project_name": "Project Name",
      "project_description": "1-2 sentence description of the project aim",
      "responsibilities": [
        "Bullet point 1 starting with action verb",
        "Bullet point 2",
        "Bullet point 3",
        "Bullet point 4",
        "Bullet point 5"
      ],
      "technologies": "Comma-separated list of technologies used"
    }
  ],
  "education": [
    {
      "institution": "University Name",
      "location": "City, Country",
      "degree": "Degree type and field",
      "start_year": "YYYY",
      "end_year": "YYYY"
    }
  ],
  "languages": [
    {
      "language": "English",
      "level": "Fluent/Native/Conversational/Basic"
    }
  ]
}

RESPOND WITH ONLY THE JSON. No markdown fences, no explanation.`;

function cleanJson(text: string): string {
  let content = text.trim();
  if (content.startsWith("```")) {
    content = content.split("\n").slice(1).join("\n");
    content = content.replace(/```\s*$/, "");
  }
  return content.trim();
}

export async function formatCvWithAI(
  rawText: string,
  apiKey: string
): Promise<CvData> {
  const key = normalizeAnthropicApiKey(apiKey);
  if (!key.startsWith("sk-ant-")) {
    throw new Error(
      "API key should start with sk-ant-. Check for typos or a truncated paste."
    );
  }
  const client = new Anthropic({ apiKey: key, baseURL: "https://api.anthropic.com" });

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    temperature: 0.3,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Parse and reformat this CV into the template structure:\n\n${rawText}`,
      },
    ],
  });

  const block = message.content?.[0];
  if (!block || block.type !== "text") {
    throw new Error("Claude returned no text. Try again or use a shorter CV.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanJson(block.text));
  } catch {
    throw new Error(
      "Claude returned invalid JSON. Try again — the model may have added explanation text."
    );
  }
  return coerceCvData(parsed);
}

const CHAT_SYSTEM = `You are Digip-AI, a CV editing assistant. The user has a formatted CV in JSON format. They will ask you to make changes to it.

You MUST respond with valid JSON containing two fields:
1. "message": A short friendly confirmation of what you changed
2. "cv_data": The COMPLETE updated CV JSON object with the requested changes applied

Do NOT include markdown fences. Respond with raw JSON only.
If the user asks something that doesn't require a CV change, still return the full cv_data unchanged along with your message.`;

export async function chatWithAI(
  cvData: CvData,
  userMessage: string,
  apiKey: string
): Promise<{ message: string; cv_data: CvData }> {
  const key = normalizeAnthropicApiKey(apiKey);
  if (!key.startsWith("sk-ant-")) {
    throw new Error(
      "API key should start with sk-ant-. Check for typos or a truncated paste."
    );
  }
  const client = new Anthropic({ apiKey: key, baseURL: "https://api.anthropic.com" });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    temperature: 0.3,
    system: CHAT_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Current CV data:\n${JSON.stringify(cvData, null, 2)}\n\nUser request: ${userMessage}`,
      },
    ],
  });

  const block = response.content?.[0];
  if (!block || block.type !== "text") {
    throw new Error("Claude returned no text. Try again.");
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleanJson(block.text)) as Record<string, unknown>;
  } catch {
    throw new Error("Digip-AI returned invalid JSON. Please rephrase your request.");
  }
  const msg = String(parsed.message ?? "Updated.");
  const cvRaw = parsed.cv_data;
  if (cvRaw === undefined || cvRaw === null) {
    throw new Error("Digip-AI response missing cv_data.");
  }
  return { message: msg, cv_data: coerceCvData(cvRaw) };
}
