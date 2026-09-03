import { Suspense } from "react";
import { AboutUs } from "@/components/home/AboutUs";
import { CtaBanner } from "@/components/home/CtaBanner";
import { Features } from "@/components/home/Features";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { PopularServices } from "@/components/home/PopularServices";
import { Reviews } from "@/components/home/Reviews";
import { ListingCardSkeleton, ReviewCardSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

function PopularSkeleton() {
  return (
    <section className="bg-white py-10 dark:bg-zinc-950 md:py-14" aria-busy="true" aria-label="Loading popular services">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-2 h-3 w-64" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ListingCardSkeleton />
          <ListingCardSkeleton />
          <ListingCardSkeleton />
          <ListingCardSkeleton />
        </div>
      </div>
    </section>
  );
}

function ReviewsSkeleton() {
  return (
    <section className="bg-zinc-50 py-12 dark:bg-zinc-900 md:py-16" aria-busy="true" aria-label="Loading reviews">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-2 h-6 w-48" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ReviewCardSkeleton />
          <ReviewCardSkeleton />
          <ReviewCardSkeleton />
        </div>
      </div>
    </section>
  );
}

export default async function Home() {
  return (
    <div className="flex flex-col">
      <Hero />
      <Suspense fallback={<PopularSkeleton />}>
        <PopularServices />
      </Suspense>
      <HowItWorks />
      <Features />
      <AboutUs />
      <Suspense fallback={<ReviewsSkeleton />}>
        <Reviews />
      </Suspense>
      <CtaBanner />
    </div>
  );
}
