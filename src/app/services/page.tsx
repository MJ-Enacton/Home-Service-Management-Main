import { Suspense } from "react";
import { AllServicesClient } from "./AllServicesClient";
import { listCategories } from "@/lib/db/queries/categories";

export default async function AllServicesPage() {
  const categories = await listCategories();

  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-7xl px-4 py-24 md:px-6">
          <p className="text-center text-sm text-muted-foreground">
            Loading services…
          </p>
        </main>
      }
    >
      <AllServicesClient categories={categories} />
    </Suspense>
  );
}