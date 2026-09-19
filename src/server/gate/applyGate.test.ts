import { describe, expect, it } from "vitest";
import { applyGate, effectiveStatusesForGate } from "@/server/gate/applyGate";

describe("applyGate", () => {
  it("holds on critical FAIL", () => {
    expect(
      applyGate([
        { critical: true, status: "PASS" },
        { critical: true, status: "FAIL" },
      ]),
    ).toBe("HELD");
  });

  it("holds on critical LOW_CONFIDENCE", () => {
    expect(
      applyGate([{ critical: true, status: "LOW_CONFIDENCE" }]),
    ).toBe("HELD");
  });

  it("submits when all criticals pass", () => {
    expect(
      applyGate([
        { critical: true, status: "PASS" },
        { critical: false, status: "NOTE" },
      ]),
    ).toBe("SUBMITTED");
  });

  it("uses effectiveStatus after override mapping", () => {
    const gate = applyGate(
      effectiveStatusesForGate([
        {
          critical: true,
          status: "FAIL",
          effectiveStatus: "PASS",
        },
      ]),
    );
    expect(gate).toBe("SUBMITTED");
  });
});
