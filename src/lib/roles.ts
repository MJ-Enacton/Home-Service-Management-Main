import type { Role } from "@/types";

export function resolveRole(role?: string | null): Role {
  if (role === "provider" || role === "admin") {
    return role;
  }

  return "customer";
}
