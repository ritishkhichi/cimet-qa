import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const recording = await prisma.recording.findUnique({ where: { id } });
  if (!recording) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.isAbsolute(recording.filePath)
    ? recording.filePath
    : path.join(process.cwd(), recording.filePath);

  try {
    const data = await readFile(filePath);
    return new NextResponse(data, {
      headers: {
        "Content-Type": recording.mimeType || "audio/mpeg",
        "Content-Length": String(data.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing on disk" }, { status: 404 });
  }
}
