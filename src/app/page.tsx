import { Hero } from "@/components/home/Hero";
import { PopularServices } from "@/components/home/PopularServices";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Features } from "@/components/home/Features";
import { CtaBanner } from "@/components/home/CtaBanner";

export default async function Home() {
  return (
    <div className="flex flex-col">
      <Hero />
      <PopularServices />
      <HowItWorks />
      <Features />
      <CtaBanner />
    </div>
  );
}
