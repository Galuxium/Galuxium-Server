const axios = require("axios");
const { OPENROUTER_API_KEY, OPENROUTER_API_URL } = require("../config");

const systemPrompt = `
You are a world-class SaaS code generator.

Guidelines:
- Always return clean, valid code inside triple backticks.
- Use TypeScript with strict typing.
- All React files must use \`.tsx\`.
- Always define and use \`interface\`s for props and types.
- Do not include explanations, comments, or extra text. Just return the code block.
- For every prompt, generate a full working file.
`;


function extractCode(content) {
  content = content.trim();

  const match = content.match(/```(?:tsx|ts|js|json)?\n?([\s\S]*?)```/);
  if (match) {
    let code = match[1].trim();
    let lines = code.split("\n");

    // Remove garbage first lines like "typescript", "json", "on", "file", etc.
    while (/^(typescript|json|tsx|ts|js|on|file|code)$/i.test(lines[0]?.trim())) {
      lines.shift();
    }

    return lines.join("\n").trim();
  }

  if (content.length > 0) return content;
  throw new Error("No valid code content found");
}


async function generateFile(taskPrompt) {
  const res = await axios.post(
    OPENROUTER_API_URL,
    {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: taskPrompt },
      ],
      temperature: 0.4,
      max_tokens: 4096,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  const aiOutput = res?.data?.choices?.[0]?.message?.content;
  if (!aiOutput) throw new Error("AI response empty");
  return extractCode(aiOutput);
}

function buildContextPrompt(taskPrompt, formData, ideaPrompt, projectName = "") {
  return `
${taskPrompt}

Context:
- Project Name: ${projectName}
- Idea: ${formData.idea}
- Industry: ${formData.industry}
- Audience: ${formData.audience}
- Features: ${formData.features.join(", ")}
- Authentication: ${formData.auth}
- Database: ${formData.database}
- Design: ${formData.design}
- Deployment: ${formData.deployment}
- AI Model: ${formData.aiModel}

Full Description:
${ideaPrompt}
`.trim();
}


function createDynamicTaskList(formData = {}) {
  const brandName = formData.projectName || formData.brand || "Galuxium Premium";
  const idea = formData.idea || formData.description || `A premium website for ${brandName}.`;
  const heroImage =
    (formData.heroImage && formData.heroImage.trim()) ||
    "https://images.unsplash.com/photo-1521334884684-d80222895322?q=80&w=1400&auto=format&fit=crop";

  function enrich(t) {
    // all prompts MUST instruct the LLM to return only the exact file contents (no markdown fences)
    const header = `Project: "${brandName}"
Goal: Produce a premium, frontend-only Next.js 14 App Router site using React JSX (no TypeScript) and INLINE STYLES (no Tailwind, no external CSS). Use className only if you want but primary styling MUST be inline style objects. Use Framer Motion for subtle animations. Use accessible HTML semantics and ARIA attributes. Return EXACT file contents for ${t.file} as plain text, do NOT wrap in markdown or add extra commentary.
Context:
- Idea: ${idea}
- Hero image: ${heroImage}
- Features: ${(formData.features || []).join(", ") || "Landing, Layout, Premium UI"}
`;
    return `${header}\n\n${t.prompt}\n\nExtra requirements:\n- All files are .jsx (JSX only). Components that need browser APIs must have "use client" at top.\n- No backend code or external CSS files; use inline styles and small embedded <style> blocks only when necessary for responsive breakpoints.\n- Use Unsplash placeholder images (provided) and include image alt text.\n- Keep code runnable inside a Next.js 14 project with src/app layout/page structure.\n- Keep file self-contained and import only from local paths or 'framer-motion' and 'react'.\n- Avoid any fences or commentary in LLM output; return the file body only.`;
  }

  const tasks = [
    {
      file: "package.json",
      prompt: `Create a minimal package.json for a frontend-only Next.js 14 App Router project (JSX). Include dependencies: next@14, react, react-dom, framer-motion, clsx, axios. Provide scripts: dev, build, start, lint. No Tailwind or postcss.`,
    },
    {
      file: "next.config.js",
      prompt: `Create next.config.js enabling appDir: true and images.unoptimized: true (so examples work without image domains).`,
    },
    {
      file: "app/layout.jsx",
      prompt: `Create src/app/layout.jsx: the App Router root layout. Include proper <head> meta (title = "${brandName}", description = "${idea}"), link a small embedded <style> block for responsive helpers (kept tiny), and render a centered container with <Navbar /> at top and <Footer /> at bottom. Use inline styles for the main backgrounds (layered gradients + soft radial accents). Export default RootLayout({ children }).`,
    },
    {
      file: "app/page.jsx",
      prompt: `Create src/app/page.jsx: premium landing page. Sections:
- Hero: full-bleed hero with background image (${heroImage}), dark overlay, large fluid headline, subhead, primary & secondary CTAs.
- Features: 3 feature cards (title, description, icon emoji) laid out responsively.
- Gallery: 3 large image cards (use Unsplash placeholders).
- Testimonials: client-only carousel with 3 testimonials (use state).
- Pricing: 3-tier pricing section with highlight card.
- Footer: newsletter input (mocked), links.

Use inline style objects for all styling; use Framer Motion for entrance and hover animations; ensure responsive breakpoints via embedded <style> in layout or small style tags in component if absolutely necessary. Ensure accessibility attributes (aria-*).`,
    },
    {
      file: "components/Navbar.jsx",
      prompt: `Create a responsive Navbar with brand logo (SVG inline), nav links (anchor anchors to sections), and CTAs. Use inline styles: glassmorphism panel, backdrop blur, subtle gradient, sticky top behavior. Use framer-motion entrance animation. Include mobile hamburger that toggles a client-only menu (use client at top).`,
    },
    {
      file: "components/Hero.jsx",
      prompt: `Create a Hero component (src/components/Hero.jsx). Use "use client". Build the hero with inline style objects: background image (use ${heroImage}), gradient overlay, a left column headline and CTAs and a right column image card or mock product. Use Framer Motion for staggered text reveal. Implement "scroll to features" on CTA. Export default Hero.`,
    },
    {
      file: "components/FeatureCard.jsx",
      prompt: `Create FeatureCard component (src/components/FeatureCard.jsx): props { title, description, icon }. Use inline gradient border, rounded corners, and boxShadow. Add hover lift animation via framer-motion. Export default.`,
    },
    {
      file: "components/TestimonialCarousel.jsx",
      prompt: `Create TestimonialCarousel (src/components/TestimonialCarousel.jsx) as a client component. Implement a simple carousel (useState index) with prev/next controls, keyboard navigation, and framer-motion sliding transitions. Include 3 sample testimonials.`,
    },
    {
      file: "components/Gallery.jsx",
      prompt: `Create Gallery (src/components/Gallery.jsx) client-only: responsive 3-column grid on desktop, 1 column mobile. Each card opens a lightweight lightbox modal (client-only) with enlarged image. Use inline styles and framer-motion for modal animation.`,
    },
    {
      file: "components/Pricing.jsx",
      prompt: `Create Pricing section (src/components/Pricing.jsx) with 3 cards: Starter, Pro (recommended), Enterprise. Use inline styles, highlight recommended card with gradient, and include CTA buttons. Use framer-motion hover transforms.`,
    },
    {
      file: "components/Footer.jsx",
      prompt: `Create Footer (src/components/Footer.jsx) with brand info, social icon links (SVGs inline), copyright and a newsletter mock input. Use inline styles and responsive layout.`,
    },
    {
      file: "lib/cn.js",
      prompt: `Create a small helper src/lib/cn.js that exports a default function to join className values: export default function cn(...args){ return args.filter(Boolean).join(' ') }`,
    },
    {
      file: "public/placeholders.json",
      prompt: `Return a JSON array of 6 high-quality Unsplash image URLs suitable for hero/gallery placeholders.`,
    },
    {
      file: ".eslintrc.cjs",
      prompt: `Generate a minimal ESLint config for a Next.js project (JSX) with recommended rules and Prettier integration.`,
    },
    {
      file: ".prettierrc",
      prompt: `Generate Prettier config: singleQuote true, trailingComma all, printWidth 100.`,
    },
    {
        file: "components/MapEmbed.jsx",
      prompt: `Create MapEmbed (src/components/MapEmbed.jsx) client-only: embed a responsive map iframe placeholder, style container with inline styles, and an alt text fallback.`,

    },
    {
            file: "components/ContactForm.jsx",
      prompt: `Create ContactForm (src/components/ContactForm.jsx) client-only: name, email, message fields, client-side validation, and a mocked submit that shows a success message. Use inline styles and accessible labels.`,

    }
  ];





  return [...tasks].map(t => ({
    file: t.file,
    prompt: enrich(t)
  }));
}




exports.generateSaaSCode = async (formData, ideaPrompt, config = {}, onProgress = null, projectName = "") => {
  const generatedFiles = [];
  const tasks = createDynamicTaskList(formData);

  for (const task of tasks) {
    const contextualPrompt = buildContextPrompt(task.prompt, formData, ideaPrompt, projectName);
    if (typeof onProgress === "function") onProgress(task.file);

    const code = await generateFile(contextualPrompt);
    generatedFiles.push({ path: task.file, content: code });
  }

  return generatedFiles;
};

