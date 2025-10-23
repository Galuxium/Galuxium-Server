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
      model: "mistralai/mixtral-8x7b-instruct",
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


// --- Dynamic task generation ---
function createDynamicTaskList(formData) {
  const base = [
    {
      file: "package.json",
      prompt: "Generate a package.json for a full-stack SaaS app using Next.js 14 App Router, TypeScript, Tailwind CSS, Prisma ORM, PlanetScale, Clerk, Stripe, ESLint, and Prettier.",
    },
    {
      file: "tsconfig.json",
      prompt: "Generate a strict tsconfig.json for a modern Next.js TypeScript app.",
    },
    {
      file: "tailwind.config.js",
      prompt: "Generate tailwind.config.js for Next.js with Tailwind v3 support.",
    },
    {
      file: "postcss.config.js",
      prompt: "Generate postcss.config.js for Tailwind CSS.",
    },
  ];

  const features = [];

  if (formData.features.includes("Landing Page")) {
    features.push({
      file: "src/app/page.tsx",
      prompt: "Generate a Next.js 14 App Router landing page in TypeScript using Tailwind. Include Hero, Features, Testimonials, Pricing, and CTA sections. Use interface for props.",
    });
  }

  if (formData.features.includes("Authentication")) {
    features.push({
      file: "src/app/sign-in/[[...sign-in]]/page.tsx",
      prompt: "Generate a Clerk-compatible sign-in page using useUser() and ClerkProvider. Use TypeScript and interfaces.",
    });
  }

  if (formData.features.includes("Database CRUD")) {
    features.push({
      file: "src/app/projects/page.tsx",
      prompt: "Generate a CRUD project listing page fetching user-specific projects using Prisma and Clerk. Use useUser and define types for responses.",
    });
  }

  if (formData.features.includes("Analytics Dashboard")) {
    features.push({
      file: "src/app/analytics/page.tsx",
      prompt: "Generate a dashboard page with sample charts using Chart.js. Use TypeScript and interface props.",
    });
  }

  if (formData.features.includes("Admin Panel")) {
    features.push({
      file: "src/app/dashboard/page.tsx",
      prompt: "Generate an admin dashboard with revenue, users, logs. Strict TypeScript with interfaces.",
    });
  }

  if (formData.features.includes("Email Notifications")) {
    features.push({
      file: "lib/email.ts",
      prompt: "Generate a utility file to send transactional emails using Resend or Nodemailer. Use TypeScript with strict types.",
    });
  }

  if (formData.features.includes("Payment Integration")) {
    features.push({
      file: "src/app/billing/page.tsx",
      prompt: "Generate a Stripe billing page with plan info and customer portal. Use strict TypeScript.",
    });
  }

  if (formData.features.includes("File Upload")) {
    features.push({
      file: "src/app/upload/page.tsx",
      prompt: "Generate a drag-and-drop file upload page using React Dropzone and Tailwind. Use interfaces.",
    });
  }

  const shared = [
    {
      file: "src/app/layout.tsx",
      prompt: "Generate a layout.tsx with ClerkProvider and sidebar navigation. Use interface for props.",
    },
    {
      file: "src/app/settings/page.tsx",
      prompt: "Generate a settings page for updating Clerk user profile. Use TypeScript strictly.",
    },
    {
      file: "prisma/schema.prisma",
      prompt: "Generate a Prisma schema for Users, Projects, Subscriptions with relations.",
    },
    {
      file: "lib/prisma.ts",
      prompt: "Generate a singleton PrismaClient instance setup for Next.js with strict TS.",
    },
  ];

  return [...base, ...features, ...shared];
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

