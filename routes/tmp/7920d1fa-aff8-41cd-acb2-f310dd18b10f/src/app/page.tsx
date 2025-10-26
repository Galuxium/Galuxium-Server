// HeroSection.tsx
import Image from 'next/image';

interface HeroSectionProps {
  title: string;
  subtitle: string;
  imageSrc: string;
  imageAlt: string;
}

const HeroSection = ({ title, subtitle, imageSrc, imageAlt }: HeroSectionProps) => {
  return (
    <section className="bg-gray-100 py-16">
      <div className="container mx-auto flex flex-col lg:flex-row items-center justify-between">
        <div className="lg:w-1/2">
          <h1 className="text-5xl font-bold mb-4 text-gray-800">{title}</h1>
          <p className="text-xl mb-8 text-gray-600 leading-relaxed">{subtitle}</p>
          {/* Add a call-to-action button here */}
        </div>
        <div className="lg:w-1/2">
          <Image src={imageSrc} alt={imageAlt} width={500} height={500} />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

// FeaturesSection.tsx
import Image from 'next/image';

interface FeatureProps {
  title: string;
  description: string;
  icon: string;
}

const Feature = ({ title, description, icon }: FeatureProps) => {
  return (
    <div className="text-center p-8 border border-gray-300 rounded">
      <div className="flex items-center justify-center mb-4 w-16 h-16 mx-auto text-gray-600 rounded-full bg-gray-100">
        <Image src={icon} width={32} height={32} alt={title} />
      </div>
      <h3 className="text-xl font-medium mb-2 text-gray-800">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};

interface FeaturesSectionProps {
  features: FeatureProps[];
}

const FeaturesSection = ({ features }: FeaturesSectionProps) => {
  return (
    <section className="bg-gray-100 py-16">
      <div className="container mx-auto text-center">
        <h2 className="text-4xl font-bold mb-8 text-gray-800">Our Features</h2>
        <div className="flex flex-wrap -mx-4">
          {features.map((feature, index) => (
            <div key={index} className="w-full md:w-1/3 px-4">
              <Feature {...feature} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

// TestimonialsSection.tsx
interface TestimonialProps {
  name: string;
  title: string;
  content: string;
  imageSrc: string;
  imageAlt: string;
}

const Testimonial = ({ name, title, content, imageSrc, imageAlt }: TestimonialProps) => {
  return (
    <div className="bg-white p-8 rounded shadow-md mb-8">
      <div className="flex items-center mb-6">
        <Image src={imageSrc} alt={imageAlt} width={64} height={64} className="w-16 h-16 rounded-full" />
        <div className="ml-4">
          <h5 className="text-xl font-medium text-gray-800">{name}</h5>
          <p className="text-gray-600">{title}</p>
        </div>
      </div>
      <p className="text-gray-600">{content}</p>
    </div>
  );
};

interface TestimonialsSectionProps {
  testimonials: TestimonialProps[];
}

const TestimonialsSection = ({ testimonials }: TestimonialsSectionProps) => {
  return (
    <section className="bg-gray-100 py-16">
      <div className="container mx-auto text-center">
        <h2 className="text-4xl font-bold mb-8 text-gray-800">Testimonials</h2>
        <div className="flex flex-wrap -mx-4">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="w-full md:w-1/3 px-4">
              <Testimonial {...testimonial} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;

// PricingSection.tsx
interface PriceProps {
  title: string;
  price: string;
  description: string;
  features: string[];
}

const Price = ({ title, price, description, features }: PriceProps) => {
  return (
    <div className="text-center p-8 border border-gray-300 rounded">
      <h3 className="text-xl font-medium mb-2 text-gray-800">{title}</h3>
      <p className="text-gray-600">{price}</p>
      <p className="text-gray-600 mb-8">{description}</p>
      <ul className="list-inside text-gray-600">
        {features.map((feature, index) => (
          <li key={index}>{feature}</li>
        ))}
      </ul>
      <button className="bg-blue-500 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded">
        Sign Up
      </button>
    </div>
  );
};

interface PricingSectionProps {
  prices: PriceProps[];
}

const PricingSection = ({ prices }: PricingSectionProps) => {
  return (
    <section className="bg-gray-100 py-16">
      <div className="container mx-auto text-center">
        <h2 className="text-4xl font-bold mb-8 text-gray-800">Pricing</h2>
        <div className="flex flex-wrap -mx-4">
          {prices.map((price, index) => (
            <div key={index} className="w-full md:w-1/3 px-4">
              <Price {...price} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;

// CTASection.tsx

const CTASection = () => {
  return (
    <section className="bg-blue-500 py-16">
      <div className="container mx-auto text-center">
        <h2 className="text-4xl font-bold mb-8 text-white">Ready to get started?</h2>
        <button className="bg-white hover:bg-gray-100 text-blue-500 font-medium py-2 px-4 rounded">
          Sign Up
        </button>
      </div>
    </section>
  );
};

export default CTASection;

// index.tsx
import HeroSection from '../components/HeroSection';
import FeaturesSection from '../components/FeaturesSection';
import TestimonialsSection from '../components/TestimonialsSection';
import PricingSection from '../components/PricingSection';
import CTASection from '../components/CTASection';

export default function Home() {
  const heroSectionProps = {
    title: 'Design On-Demand',
    subtitle: 'Connecting small businesses with freelance graphic designers for quick design projects.',
    imageSrc: '/hero-image.svg',
    imageAlt: 'Hero illustration',
  };

  const features = [
    {
      title: 'Easy to Use',
      description: 'Our platform is user-friendly and easy to navigate.',
      icon: '/easy-to-use.svg',
    },
    {
      title: 'Affordable Prices',
      description: 'We offer competitive pricing for all design projects.',
      icon: '/affordable-prices.svg',
    },
    {
      title: 'Fast Turnaround',
      description: 'Get your designs quickly with our fast turnaround times.',
      icon: '/fast-turnaround.svg',
    },
  ];

  const testimonials = [
    {
      name: 'John Doe',
      title: 'CEO, Acme Inc.',
      content: 'The platform is fantastic! I received my design within 24 hours and the quality was outstanding.',
      imageSrc: '/john-doe.jpg',
      imageAlt: 'John Doe portrait',
    },
    {
      name: 'Jane Smith',
      title: 'Founder, Smith Enterprises',
      content: 'I highly recommend Design On-Demand for any small business in need of quick design work.',
      imageSrc: '/jane-smith.jpg',
      imageAlt: 'Jane Smith portrait',
    },
  ];

  const prices = [
    {
      title: 'Basic',
      price: '$29/month',
      description: 'Unlimited requests, basic turnaround',
      features: [
        'Unlimited requests',
        'Basic turnaround',
        'Email support',
        'Access to our designer community',
      ],
    },
    {
      title: 'Pro',
      price: '$59/month',
      description: 'Unlimited requests, priority turnaround',
      features: [
        'Unlimited requests',
        'Priority turnaround',
        'Priority email support',
        'Access to our designer community',
        'Dedicated account manager',
      ],
    },
  ];

  return (
    <div>
      <HeroSection {...heroSectionProps} />
      <FeaturesSection features={features} />
      <TestimonialsSection testimonials={testimonials} />
      <PricingSection prices={prices} />
      <CTASection />
    </div>
  );
}