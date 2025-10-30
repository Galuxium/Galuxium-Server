

const { generateSaaSCode } = require("../services/mvpService");
const { cleanDirectory, writeFiles, createZip } = require("../services/fileService");
 const { createUserSupabaseClient } = require("../services/supabase");

const fs = require("fs-extra");
const path = require("path");
const { exec } = require("child_process");
const getPort = require("get-port");

let currentPreviewProcess = null;
let currentPreviewDir = null;

exports.previewMVP = async (req, res) => {
  try {
    const files = req.body.files;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "Invalid or empty files array" });
    }

    // 🧹 Stop any running preview
    if (currentPreviewProcess) {
      console.log("🛑 Stopping previous preview...");
      currentPreviewProcess.kill("SIGTERM");
      currentPreviewProcess = null;

      if (currentPreviewDir) {
        await fs.remove(currentPreviewDir).catch(() => {});
      }
    }

    // 📁 Setup directories outside backend
    const previewsRoot = path.resolve(__dirname, "../../mvp_previews");
    const baseTemplateDir = path.join(previewsRoot, "base_template");
    await fs.ensureDir(previewsRoot);

    // 🧱 Ensure cached base template exists
    if (!(await fs.pathExists(path.join(baseTemplateDir, "node_modules")))) {
      console.log("📦 Setting up base Next.js template (one-time setup)...");
      await fs.ensureDir(baseTemplateDir);

      // Create minimal package.json
      const pkg = {
        name: "mvp-base-template",
        version: "1.0.0",
        private: true,
        scripts: { dev: "next dev" },
        dependencies: {
          next: "latest",
          react: "latest",
          "react-dom": "latest",
        },
      };
      await fs.writeJson(path.join(baseTemplateDir, "package.json"), pkg, { spaces: 2 });

      // Install dependencies once
      await new Promise((resolve, reject) => {
        exec("npm install --legacy-peer-deps", { cwd: baseTemplateDir }, (err, stdout, stderr) => {
          if (err) {
            console.error("❌ Failed to build base template:", stderr);
            return reject(new Error(stderr));
          }
          console.log("✅ Base template ready.");
          resolve();
        });
      });
    }

    // 🧩 Create a fresh preview folder by copying the base template
    const tempDir = path.join(previewsRoot, `preview-${Date.now()}`);
    await fs.copy(baseTemplateDir, tempDir, { dereference: true });
    currentPreviewDir = tempDir;

    console.log(`📁 Creating preview project in ${tempDir}`);

    // ✍️ Write user files on top of base template
    // ✍️ Write user files
for (const file of files) {
  if (!file.path || typeof file.content === "undefined") continue;
  const fullPath = path.join(tempDir, file.path);
  await fs.ensureDir(path.dirname(fullPath));
  await fs.writeFile(fullPath, file.content, "utf8");
}

// 🔧 Fix missing "next/config" import issue in next.config.mjs
const nextConfigPath = path.join(tempDir, "next.config.mjs");
if (await fs.pathExists(nextConfigPath)) {
  let content = await fs.readFile(nextConfigPath, "utf8");
  if (content.includes("next/config")) {
    console.log("⚙️  Patching next.config.mjs to fix ESM import...");
    content = content.replace(/['"]next\/config['"]/g, "'next/dist/config'");
    await fs.writeFile(nextConfigPath, content, "utf8");
  }
}


    // 🧠 Ensure dependencies still exist (skip reinstall)
    const nodeModulesPath = path.join(tempDir, "node_modules");
    if (!(await fs.pathExists(nodeModulesPath))) {
      console.log("📦 Copying cached dependencies...");
      await fs.copy(path.join(baseTemplateDir, "node_modules"), nodeModulesPath);
    }

    
    const port = 3002

    // 🚀 Start Next.js preview
    console.log(`🚀 Starting Next.js preview on port ${port}...`);
    const child = exec(`npm run dev -- -p ${port}`, { cwd: tempDir });

    child.stdout.on("data", (d) => console.log(`[PREVIEW:${port}] ${d.toString()}`));
    child.stderr.on("data", (d) => console.error(`[PREVIEW_ERR:${port}] ${d.toString()}`));

    currentPreviewProcess = child;

    res.json({
      success: true,
      previewUrl: `http://localhost:${port}`,
      outputDir: tempDir,
      cacheUsed: true,
    });

  } catch (err) {
    console.error("PreviewMVP error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.stopPreview = async (req, res) => {
  try {
    if (currentPreviewProcess) {
      console.log("🛑 Stopping running preview server...");
      currentPreviewProcess.kill("SIGTERM");
      currentPreviewProcess = null;
    }

    if (currentPreviewDir) {
      await fs.remove(currentPreviewDir);
      console.log("🧹 Removed preview directory");
      currentPreviewDir = null;
    }

    return res.json({ success: true, message: "Preview stopped and cleaned up." });
  } catch (err) {
    console.error("StopPreview error:", err);
    res.status(500).json({ error: err.message });
  }
};




exports.streamGenerateMVP = async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {


    const { userId, prompt, projectName, formData } = req.query;
    if (!userId || !prompt || !formData) throw new Error("Missing fields");


    const parsed = JSON.parse(formData);
    const cleanName = (parsed.idea||"mvp")
      .split(/\s+/).slice(0,3).join("-")
      .toLowerCase().replace(/[^\w\-]/g,"").replace(/\-+/g,"-");
    const finalName = projectName || cleanName;

    res.write(`data: ${JSON.stringify({ projectName: finalName })}\n\n`);

    const outputRoot = path.resolve(__dirname,"../../outputs");
    const projectDir = path.join(outputRoot, finalName);
    const zipFile = path.join(outputRoot, `${finalName}.zip`);
    cleanDirectory(projectDir);

    // generate code, streaming filenames
    const files = await generateSaaSCode(parsed, prompt, {}, filename => {
      res.write(`data: ${JSON.stringify({ filename })}\n\n`);
    });

    writeFiles(files, projectDir);
    await createZip(projectDir, zipFile);

   

// inside the controller:
const token = req.headers.authorization?.replace("Bearer ", "");
if (!token) throw new Error("Missing access token");

const userClient = createUserSupabaseClient(token);

const { error: dbErr } = await userClient.from("mvps").insert([
  {
    user_id: userId,
    name: finalName,
    prompt,
    files,
  }
]);
    if (dbErr) console.error("DB insert error:", dbErr);

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("Stream error:", err);
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
};

exports.downloadZip = (req, res) => {
  const { projectName } = req.params;
  const zipPath = path.resolve(__dirname,"../../outputs", `${projectName}.zip`);
  if (!fs.existsSync(zipPath)) return res.status(404).json({ message: "Not found" });
  res.download(zipPath);
};

