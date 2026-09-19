import { auth } from "@/auth";
import type { UserRole } from "@prisma/client";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireRole(roles: UserRole[]) {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}
