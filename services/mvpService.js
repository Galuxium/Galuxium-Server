/**
 * =====================================================
 * File: services/codeGenerator.js
 * Author: Galuxium Engineering
 * Purpose: Robust, zero-error Next.js SaaS Generator
 * =====================================================
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const {
  OPENROUTER_API_KEY,
  OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions",
} = require("../config");

// =====================================================
// 🧠 System Prompt — Next.js Modifier
// =====================================================
const systemPrompt = `
You are Galuxium — an AI fullstack engineer.
You modify existing Next.js 15 apps to create beautiful, runnable MVPs using JavaScript only.

### Stack
- Framework: Next.js 15 (App Router)
- Language: JavaScript only (.js, .jsx)
- Styling: Tailwind CSS + shadcn/ui
- Animations: Framer Motion
- Components: lucide-react icons
- No TypeScript, no placeholders, no errors.

### Output Rules
- Return ONLY full file content inside one code block.
- All imports must resolve correctly.
- Each file must build successfully.
- Focus on editing scaffolded files, not adding frameworks.
`;

// =====================================================
// 🧩 Extract Code Block from AI Output
// =====================================================
function extractCode(content = "") {
  const match = content.match(/```(?:jsx|js|json|md)?\n?([\s\S]*?)```/);
  return match ? match[1].trim() : content.trim();
}

// =====================================================
// ⚙️ API Caller (OpenRouter or Local LLM)
// =====================================================
async function generateFile(taskPrompt, useLocal = false) {
  const apiURL = useLocal
    ? "http://localhost:1234/v1/chat/completions"
    : OPENROUTER_API_URL;

  if (!useLocal && !OPENROUTER_API_KEY) {
    throw new Error("❌ Missing OPENROUTER_API_KEY in environment variables.");
  }

  const headers = {
    "Content-Type": "application/json",
    ...(useLocal ? {} : { Authorization: `Bearer ${OPENROUTER_API_KEY}` }),
  };

  const payload = {
    model: useLocal ? "codellama-7b-kstack" : "nvidia/nemotron-nano-9b-v2:free",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: taskPrompt },
    ],
    temperature: 0.35,
    max_tokens: 4096,
  };

  try {
    const res = await axios.post(apiURL, payload, { headers, timeout: 90000 });
    const aiOutput = res?.data?.choices?.[0]?.message?.content;
    if (!aiOutput) throw new Error("Empty AI response");
    return extractCode(aiOutput);
  } catch (err) {
    console.error("❌ AI generation failed:", err.message);
    throw err;
  }
}

// =====================================================
// 🧱 Project Bootstrap (Outside Backend)
// =====================================================
function createBaseNextApp(projectName) {
  const safeName = projectName.toLowerCase().replace(/\s+/g, "-");
  const rootDir = path.resolve(__dirname, "../../apps");
  const projectDir = path.join(rootDir, safeName);

  if (fs.existsSync(projectDir)) {
    console.log(`⚠️ Directory "${safeName}" already exists, skipping scaffold.`);
    return projectDir;
  }

  fs.mkdirSync(rootDir, { recursive: true });

  console.log(`📦 Creating base Next.js app: ${safeName}...`);
  try {
    execSync(
      `npx create-next-app@latest ${safeName} --use-npm --js --app --tailwind --eslint --no-src`,
      { stdio: "inherit", cwd: rootDir }
    );
    console.log(`✅ Successfully created app at ${projectDir}`);
  } catch (err) {
    console.error("❌ Failed to scaffold Next.js app:", err.message);
    throw new Error("Next.js creation failed. Check Node/npm and internet connectivity.");
  }

  return projectDir;
}

// =====================================================
// 🧩 Build Context Prompt
// =====================================================
function buildContextPrompt(taskPrompt, formData, ideaPrompt, projectName = "") {
  return `
${taskPrompt}

Context:
- Project: ${projectName}
- Idea: ${formData.idea || "N/A"}
- Features: ${(formData.features || []).join(", ") || "None"}
- Design: ${formData.design || "Modern"}
- AI Model: ${formData.aiModel || "default"}

Goal: Modify existing Next.js app files to match this vision.
`.trim();
}

// =====================================================
// 🧱 Task List — Files to Edit
// =====================================================
function createEditTaskList(formData = {}) {
  const { features = [], projectName = "galuxium-app" } = formData;
  const appPath = (p) => `app/${p}`;
  const apiPath = (p) => `app/api/${p}`;

  const tasks = [
    {
      file: appPath("page.jsx"),
      prompt: `Create a landing page for ${projectName} with hero section, features grid, and CTA using Framer Motion and shadcn/ui.`,
    },
    {
      file: appPath("layout.jsx"),
      prompt: `Add layout with Navbar and Footer styled using Tailwind and shadcn/ui.`,
    },
    {
      file: appPath("error.jsx"),
      prompt: `Build a user-friendly error page with retry button and subtle animation.`,
    },
    {
      file: appPath("loading.jsx"),
      prompt: `Add an animated loading page using Framer Motion.`,
    },
  ];

  if (features.includes("Authentication")) {
    tasks.push({
      file: appPath("auth/signin/page.jsx"),
      prompt: `Add a sign-in page with email/password fields inside shadcn/ui Card. Include form validation.`,
    });
  }

  if (features.includes("AI Assistant")) {
    tasks.push({
      file: appPath("ai/page.jsx"),
      prompt: `Add an AI chat interface with message list, textarea, and animated send button.`,
    });
    tasks.push({
      file: apiPath("ai/chat/route.js"),
      prompt: `Create /api/ai/chat route handler that returns mock JSON { reply: "Hello from Galuxium AI" }.`,
    });
  }

  return tasks;
}

// =====================================================
// 🚀 Main Orchestrator
// =====================================================
async function generateSaaSCode(formData, ideaPrompt, config = {}, onProgress = null) {
  const projectName = formData.projectName || "galuxium-app";

  // Create base app in /apps/
  const projectDir = createBaseNextApp(projectName);
  const tasks = createEditTaskList(formData);
  const generatedFiles = [];

  for (const task of tasks) {
    try {
      if (onProgress) onProgress(task.file);
      console.log(`✏️ Generating file: ${task.file}`);

      const contextualPrompt = buildContextPrompt(
        task.prompt,
        formData,
        ideaPrompt,
        projectName
      );

      const code = await generateFile(contextualPrompt, config.useLocal);
      const targetPath = path.join(projectDir, task.file);
      const dir = path.dirname(targetPath);

      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(targetPath, code, "utf8");

      console.log(`✅ Updated ${task.file}`);
      generatedFiles.push({ path: targetPath, content: code });
    } catch (err) {
      console.error(`❌ Failed to update ${task.file}:`, err.message);
    }
  }

  console.log(`🏁 All updates applied to "${projectName}" at ${projectDir}`);
  return generatedFiles;
}

// =====================================================
// 📦 Exports
// =====================================================
module.exports = {
  generateSaaSCode,
  createEditTaskList,
  createBaseNextApp,
};
