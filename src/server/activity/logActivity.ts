import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function logActivity(opts: {
  type: string;
  message: string;
  leadId?: string | null;
  meta?: Prisma.InputJsonValue;
}) {
  try {
    return await prisma.activityLog.create({
      data: {
        type: opts.type,
        message: opts.message,
        leadId: opts.leadId ?? null,
        meta: opts.meta ?? undefined,
      },
    });
  } catch (e) {
    console.error("[activityLog]", e);
    return null;
  }
}
