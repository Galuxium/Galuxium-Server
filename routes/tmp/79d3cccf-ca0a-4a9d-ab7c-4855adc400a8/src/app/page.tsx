```typescript
// pages/index.tsx

import Hero from "../components/Hero";
import Features from "../components/Features";
import Testimonials from "../components/Testimonials";
import Pricing from "../components/Pricing";
import CTA from "../components/CTA";

interface HomeProps {
  // add any props if needed
}

const Home: React.FC<HomeProps> = ({}) => {
  return (
    <div>
      <Hero />
      <Features />
      <Testimonials />
      <Pricing />
      <CTA />
    </div>
  );
};

export default Home;

// components/Hero/Hero.tsx

import Image from "next/image";
import Link from "next/link";

interface HeroProps {
  title: string;
  subtitle: string;
  imageSrc: string;
  ctaText: string;
  ctaUrl: string;
}

const Hero: React.FC<HeroProps> = ({
  title,
  subtitle,
  imageSrc,
  ctaText,
  ctaUrl,
}) => {
  return (
    <section className="bg-blue-500 text-white">
      <div className="container mx-auto flex px-5 py-24 items-center justify-center flex-col">
        <img className="lg:w-1/6 md:w-1/6 w-10/12 mb-10 object-cover object-center rounded" alt="hero" src={imageSrc} />
        <h1 className="title-font sm:text-4xl text-3xl mb-4 text-white">{title}</h