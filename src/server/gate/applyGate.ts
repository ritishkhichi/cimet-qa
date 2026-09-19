import type { GateStatus, ScoreStatus } from "@prisma/client";

export type GateInput = {
  critical: boolean;
  status: ScoreStatus;
};

export function applyGate(results: GateInput[]): GateStatus {
  for (const r of results) {
    if (
      r.critical &&
      (r.status === "FAIL" || r.status === "LOW_CONFIDENCE")
    ) {
      return "HELD";
    }
  }
  return "SUBMITTED";
}

export function effectiveStatusesForGate(
  results: Array<{
    critical: boolean;
    status: ScoreStatus;
    effectiveStatus: ScoreStatus;
  }>,
): GateInput[] {
  return results.map((r) => ({
    critical: r.critical,
    status: r.effectiveStatus,
  }));
}
