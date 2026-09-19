import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-helpers";
import { runScore } from "@/server/scoring/runScore";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const result = await runScore(id);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Score failed";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
