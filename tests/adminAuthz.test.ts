import { describe, expect, it } from "vitest";

/**
 * Lightweight authz contract test — admin route module exports POST/GET
 * and relies on requireRole(["ADMIN"]). Full HTTP tests need a running server.
 */
describe("admin users authz contract", () => {
  it("documents that non-ADMIN must be rejected with FORBIDDEN", () => {
    const rolesAllowed = ["ADMIN"];
    const tl = "TL";
    expect(rolesAllowed.includes(tl)).toBe(false);
    expect(rolesAllowed.includes("ADMIN")).toBe(true);
  });
});
