import type { InferSelectModel } from "drizzle-orm";
import type { user } from "@/lib/db/schema";

export type AdminUser = Pick<
  InferSelectModel<typeof user>,
  | "id"
  | "name"
  | "email"
  | "contact"
  | "role"
  | "banned"
  | "banReason"
  | "bannedAt"
  | "createdAt"
>;
