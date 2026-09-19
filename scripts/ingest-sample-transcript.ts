import { readFileSync } from "fs";
import path from "path";

async function main() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const fixture = JSON.parse(
    readFileSync(path.join(process.cwd(), "fixtures", "sample-transcript.json"), "utf8"),
  ) as {
    externalLeadId: string;
    utterances: unknown[];
  };

  const res = await fetch(`${base}/api/transcripts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      externalLeadId: fixture.externalLeadId,
      utterances: fixture.utterances,
    }),
  });

  const body = await res.json();
  if (!res.ok) {
    console.error(body);
    process.exit(1);
  }
  console.log("Ingested sample transcript:", body.lead?.externalLeadId, body.lead?.status);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
