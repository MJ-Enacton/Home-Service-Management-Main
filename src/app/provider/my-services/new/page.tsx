import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listCategories } from "@/lib/db/queries/categories";
import { ListingEditor } from "../ListingEditor";

export default async function NewServicePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/sign-in");
  }
  if (session.user.role !== "provider") {
    redirect("/");
  }

  const categories = await listCategories();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 md:px-6">
      <div className="mb-8 border-b bg-muted/40 -mx-4 px-4 py-8 md:-mx-6 md:px-6">
        <p className="text-sm text-muted-foreground">
          Account <span className="mx-1 text-border">/</span>{" "}
          <span className="font-medium text-foreground">My Services</span>
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">
          New Service
        </h1>
        <p className="text-muted-foreground">
          Describe what you offer, set your pricing and upload photos.
        </p>
      </div>

      <ListingEditor
        categories={categories.map(({ slug, name }) => ({ slug, name }))}
      />
    </main>
  );
}
