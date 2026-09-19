/**
 * Optional dialler simulation — posts audio to /api/recordings (uses Deepgram credits).
 * Usage: npx tsx scripts/simulate-dialler.ts path/to/audio.mp3 BB-SAMPLE-001
 */
import { readFileSync } from "fs";
import path from "path";

async function main() {
  const audioPath = process.argv[2];
  const externalLeadId = process.argv[3] ?? "BB-SAMPLE-001";
  if (!audioPath) {
    console.error("Usage: npx tsx scripts/simulate-dialler.ts <audioFile> [externalLeadId]");
    process.exit(1);
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const buf = readFileSync(path.resolve(audioPath));
  const form = new FormData();
  form.set("externalLeadId", externalLeadId);
  form.set(
    "audio",
    new Blob([buf], { type: "audio/mpeg" }),
    path.basename(audioPath),
  );

  const res = await fetch(`${base}/api/recordings`, { method: "POST", body: form });
  const body = await res.json();
  if (!res.ok) {
    console.error(body);
    process.exit(1);
  }
  console.log("Recording ingested:", body.lead?.status, body.transcript?.id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
