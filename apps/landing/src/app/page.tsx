import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/sections/Hero";
import { FeatureGrid } from "@/components/sections/FeatureGrid";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Security } from "@/components/sections/Security";
import { Download } from "@/components/sections/Download";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <FeatureGrid />
        <HowItWorks />
        <Security />
        <Download />
      </main>
      <Footer />
    </>
  );
}
