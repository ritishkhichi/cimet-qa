import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { resolveCheckVersion } from "@/server/checks/resolveVersion";

const prisma = new PrismaClient();

describe("resolveCheckVersion", () => {
  const retailerId = "provider_a";

  beforeAll(async () => {
    // rely on seed; ensure at least one version exists
    const v = await prisma.checkVersion.findFirst({ where: { retailerId } });
    expect(v).toBeTruthy();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("resolves version effective on call date", async () => {
    const version = await resolveCheckVersion(
      retailerId,
      new Date("2026-03-15T04:00:00.000Z"),
    );
    expect(version.label).toBe("provider_a-v1");
    expect(version.checks.length).toBeGreaterThan(0);
  });

  it("throws when no version covers the date", async () => {
    await expect(
      resolveCheckVersion(retailerId, new Date("2010-01-01T00:00:00.000Z")),
    ).rejects.toThrow(/No check library version/);
  });
});
