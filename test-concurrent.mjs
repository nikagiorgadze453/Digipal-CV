// Load-test script: simulate N concurrent users doing upload -> format -> download.
// Run the dev server first (npm run dev), then in another terminal:
//   node test-concurrent.mjs
// Or override concurrency / base URL:
//   USERS=10 BASE=http://localhost:3000 node test-concurrent.mjs

const BASE = process.env.BASE || "http://localhost:3000";
const USERS = Number(process.env.USERS || 10);

// Small, realistic CV text sample — keeps Anthropic token usage low per run
// while still exercising the same code paths a real upload hits.
function sampleCv(i) {
  return `Candidate ${i}
Senior Software Engineer

Summary
${i}-year experienced software engineer with strong Python, TypeScript and cloud background.
Built distributed data pipelines, REST APIs, and customer-facing web apps.

Experience
Acme Corp — Senior Engineer (01/2021 - Present)
  - Designed and shipped a real-time analytics pipeline handling 2B events/day.
  - Led migration from monolith to microservices on AWS (EKS, RDS, S3).
  - Mentored 4 junior engineers and ran weekly design reviews.
  - Reduced CI time by 60% by parallelizing test shards.
  Tech: Python, TypeScript, AWS, Kafka, PostgreSQL, Docker, Terraform

Globex — Software Engineer (06/2018 - 12/2020)
  - Built Django REST APIs serving 3M MAU.
  - Introduced feature flags, cut incident rate by 35%.
  - Automated deployments via GitHub Actions.
  Tech: Python, Django, PostgreSQL, Redis, Celery

Education
State University — BSc Computer Science (2014 - 2018)

Languages
English - Fluent
Spanish - Conversational
`;
}

function textBlobFormData(text, filename) {
  const fd = new FormData();
  const blob = new Blob([text], { type: "text/plain" });
  fd.append("file", blob, filename);
  return fd;
}

async function userFlow(i) {
  const label = `user#${String(i).padStart(2, "0")}`;
  const t0 = Date.now();
  const out = { i, label, upload: null, format: null, downloadPdf: null, downloadDocx: null, chat: null, error: null };
  try {
    // Step 1: upload
    const upT0 = Date.now();
    const upRes = await fetch(`${BASE}/api/upload`, {
      method: "POST",
      body: textBlobFormData(sampleCv(i), `cv-${i}.txt`),
    });
    const upText = await upRes.text();
    if (!upRes.ok) throw new Error(`upload ${upRes.status}: ${upText.slice(0, 200)}`);
    const upData = JSON.parse(upText);
    out.upload = { ms: Date.now() - upT0, fileId: upData.file_id };

    // Step 2: format (AI)
    const fmT0 = Date.now();
    const fmFd = new FormData();
    fmFd.append("file_id", upData.file_id);
    fmFd.append("template", "digipal");
    fmFd.append("raw_text", upData.extracted_text_full ?? "");
    const fmRes = await fetch(`${BASE}/api/format`, { method: "POST", body: fmFd });
    const fmText = await fmRes.text();
    if (!fmRes.ok) throw new Error(`format ${fmRes.status}: ${fmText.slice(0, 300)}`);
    const fmData = JSON.parse(fmText);
    out.format = { ms: Date.now() - fmT0, hasCvData: !!fmData.cv_data };

    // Step 3: download PDF (POST with cvData in body, same as UI does)
    const dpT0 = Date.now();
    const dpRes = await fetch(`${BASE}/api/download?template=digipal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cvData: fmData.cv_data, template: "digipal" }),
    });
    if (!dpRes.ok) {
      const t = await dpRes.text();
      throw new Error(`download-pdf ${dpRes.status}: ${t.slice(0, 200)}`);
    }
    const pdfBuf = await dpRes.arrayBuffer();
    out.downloadPdf = { ms: Date.now() - dpT0, bytes: pdfBuf.byteLength };

    // Step 4: download DOCX
    const ddT0 = Date.now();
    const ddRes = await fetch(`${BASE}/api/download-docx?template=digipal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cvData: fmData.cv_data, template: "digipal" }),
    });
    if (!ddRes.ok) {
      const t = await ddRes.text();
      throw new Error(`download-docx ${ddRes.status}: ${t.slice(0, 200)}`);
    }
    const docxBuf = await ddRes.arrayBuffer();
    out.downloadDocx = { ms: Date.now() - ddT0, bytes: docxBuf.byteLength };

    // Step 5: chat edit
    const chT0 = Date.now();
    const chFd = new FormData();
    chFd.append("file_id", upData.file_id);
    chFd.append("message", "Make the title 'Principal Engineer'.");
    chFd.append("cv_data", JSON.stringify(fmData.cv_data));
    chFd.append("template", "digipal");
    const chRes = await fetch(`${BASE}/api/chat`, { method: "POST", body: chFd });
    const chText = await chRes.text();
    if (!chRes.ok) throw new Error(`chat ${chRes.status}: ${chText.slice(0, 200)}`);
    const chData = JSON.parse(chText);
    out.chat = { ms: Date.now() - chT0, newTitle: chData?.cv_data?.title };
  } catch (e) {
    out.error = String(e?.message || e);
  } finally {
    out.totalMs = Date.now() - t0;
  }
  return out;
}

function summarize(results) {
  const ok = results.filter((r) => !r.error);
  const bad = results.filter((r) => r.error);
  const field = (key) => ok.map((r) => r[key]?.ms).filter((x) => typeof x === "number").sort((a, b) => a - b);
  const pct = (arr, p) => arr.length ? arr[Math.min(arr.length - 1, Math.floor(arr.length * p))] : null;

  const steps = ["upload", "format", "downloadPdf", "downloadDocx", "chat"];
  console.log(`\n=== Summary (N=${results.length}, ok=${ok.length}, failed=${bad.length}) ===`);
  for (const s of steps) {
    const arr = field(s);
    if (!arr.length) { console.log(`${s.padEnd(14)} no data`); continue; }
    const sum = arr.reduce((a, b) => a + b, 0);
    console.log(
      `${s.padEnd(14)} min=${arr[0]}ms p50=${pct(arr, 0.5)}ms p95=${pct(arr, 0.95)}ms max=${arr[arr.length - 1]}ms avg=${Math.round(sum / arr.length)}ms`
    );
  }
  if (bad.length) {
    console.log(`\nFailures:`);
    for (const r of bad) console.log(`  ${r.label}: ${r.error}`);
  }
}

async function main() {
  console.log(`Firing ${USERS} concurrent user flows at ${BASE} ...`);
  const t0 = Date.now();
  const results = await Promise.all(Array.from({ length: USERS }, (_, i) => userFlow(i + 1)));
  const totalMs = Date.now() - t0;
  for (const r of results) {
    console.log(
      `${r.label} total=${r.totalMs}ms up=${r.upload?.ms ?? "-"} fmt=${r.format?.ms ?? "-"} pdf=${r.downloadPdf?.ms ?? "-"} docx=${r.downloadDocx?.ms ?? "-"} chat=${r.chat?.ms ?? "-"}${r.error ? " ERR=" + r.error : ""}`
    );
  }
  summarize(results);
  console.log(`\nWall-clock total: ${totalMs}ms`);
}

main().catch((e) => { console.error(e); process.exit(1); });
