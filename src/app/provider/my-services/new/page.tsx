import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listCategories } from "@/lib/db/queries/categories";
import { BackButton } from "@/components/BackButton";
import { Card } from "@/components/ui/card";
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
    <main className="mx-auto w-full max-w-7xl px-4 pt-6 pb-16 md:px-6 md:pt-8">
      {/* No overflow-hidden here — it would break the sticky status/save sidebar inside ListingEditor. */}
      <Card>
        <div className="border-b px-5 py-4 sm:px-6">
          <BackButton href="/provider/my-services" className="mb-3 -ml-1" />
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

        <div className="bg-cream p-3 sm:p-4 dark:bg-zinc-800/60">
          <ListingEditor
            categories={categories.map(({ slug, name }) => ({ slug, name }))}
          />
        </div>
      </Card>
    </main>
  );
}
