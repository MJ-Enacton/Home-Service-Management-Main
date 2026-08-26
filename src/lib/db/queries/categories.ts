import { asc } from "drizzle-orm";

import { db } from "@/lib/db/db";
import { categories } from "@/lib/db/schema";

export interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export async function listCategories(): Promise<CategoryOption[]> {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
    })
    .from(categories)
    .orderBy(asc(categories.displayOrder), asc(categories.name));
}
