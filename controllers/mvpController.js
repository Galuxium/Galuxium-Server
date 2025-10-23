const fs = require("fs");
const path = require("path");

const { generateSaaSCode } = require("../services/mvpService");
const { cleanDirectory, writeFiles, createZip } = require("../services/fileService");
 const { createUserSupabaseClient } = require("../services/supabase");
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
