// report_builder_full_improved.js
// Enhanced single-file report + slides generator for Galuxium
// - Uses full dna_* dataset + orchestration logs + files + validations + startup_docs
// - Produces investor-grade PDF (A4) and PPTX deck with rich sections
// - Uploads artifacts to Supabase storage (galuxium_reports) and saves report metadata
// Requirements: express, pdfkit, pptxgenjs, sharp, node-fetch, @supabase/supabase-js, fs-extra
// Usage: POST /api/report/generate { "idea_id": "<uuid>" }

const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const PDFDocument = require('pdfkit');
const PptxGenJS = require('pptxgenjs');
const sharp = require('sharp');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { supabase } = require('../utils/supabase'); // keep your existing supabase client export
require('dotenv').config();

const router = express.Router();

// === CONFIG ===
const REPORT_BUCKET = process.env.SUPABASE_REPORT_BUCKET || 'galuxium_reports';
const METADATA_TABLE = process.env.REPORT_METADATA_TABLE || 'report_metadata'; // DB table for metadata
const BRAND_NAME = process.env.GALUXIUM_BRAND_NAME || 'Galuxium';
const TMP_DIR = path.join(__dirname, '../tmp_reports');
fs.ensureDirSync(TMP_DIR);

function tmpPath(filename) {
  return path.join(TMP_DIR, `${Date.now()}-${filename}`);
}

function pretty(obj, max = 2000) {
  try {
    return typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2).slice(0, max);
  } catch (e) {
    return String(obj).slice(0, max);
  }
}

// Upload helper: sanitize key, upload to REPORT_BUCKET, return public url or null
async function uploadToSupabaseBucket(keyPath, buffer, contentType = 'application/octet-stream') {
  try {
    if (!keyPath || typeof keyPath !== 'string') throw new Error('Invalid keyPath');
    // remove any leading slash
    const sanitizedKey = keyPath.replace(/^\//, '');
    console.log(`Uploading to storage bucket="${REPORT_BUCKET}" key="${sanitizedKey}" size=${Buffer.isBuffer(buffer) ? buffer.length : 'n/a'}`);

    const { error } = await supabase.storage.from(REPORT_BUCKET).upload(sanitizedKey, buffer, { contentType, upsert: true });
    if (error) {
      // storage-js sometimes gives a complex error object
      console.error('Upload error (storage.upload):', error);
      throw error;
    }
    const { data: urlData, error: urlErr } = await supabase.storage.from(REPORT_BUCKET).getPublicUrl(sanitizedKey);
    if (urlErr) {
      console.error('Upload error (getPublicUrl):', urlErr);
      throw urlErr;
    }
    console.log('Upload succeeded:', sanitizedKey);
    return urlData?.publicUrl || null;
  } catch (err) {
    console.error('Upload error:', err);
    return null;
  }
}

async function generateLogos(idea, count = 3) {
  const results = [];
  const HF_TOKEN = process.env.HF_TOKEN;

  if (!HF_TOKEN) {
    console.warn("⚠️ Missing HF_TOKEN, using fallback SVG logos only.");
  }

  for (let i = 0; i < count; i++) {
    const prompt = `${idea.idea_text || idea.title || "Startup"} — premium minimalist futuristic tech startup logo, vector-style, flat, clean, transparent background, white background preview, variation ${i + 1}`;
    console.log(`🎨 Generating logo ${i + 1} with Hugging Face Nebius API...`);

    try {
      if (process.env.HF_TOKEN) {
        const response = await fetch("https://router.huggingface.co/nebius/v1/images/generations", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.HF_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "black-forest-labs/flux-dev",
            prompt,
            response_format: "b64_json",
          }),
        });

        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

        const data = await response.json();
        const base64 = data?.data?.[0]?.b64_json;
        if (!base64) throw new Error("No base64 image data received");

        const buffer = Buffer.from(base64, "base64");
        const outPath = tmpPath(`logo_${i + 1}.png`);
        fs.writeFileSync(outPath, buffer);
        results.push({ path: outPath, method: "huggingface-nebius" });
        console.log(`✅ Logo ${i + 1} generated via Hugging Face Nebius`);
        continue;
      }
      throw new Error("HF_TOKEN missing");
    } catch (err) {
      console.warn(`⚠️ Free image API failed, fallback to SVG: ${err.message}`);
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
          <defs>
            <linearGradient id="g" x1="0" x2="1">
              <stop offset="0" stop-color="#2b2d7a" />
              <stop offset="1" stop-color="#6b21a8" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="white"/>
          <g transform="translate(200,250)">
            <circle cx="200" cy="200" r="160" fill="url(#g)"/>
            <text x="420" y="240" font-family="Helvetica" font-size="72" fill="#111" font-weight="700">${escapeXml((idea.idea_text || "Galuxium").slice(0, 12))}</text>
          </g>
        </svg>
      `;
      const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
      const outPath = tmpPath(`logo_svg_${i + 1}.png`);
      fs.writeFileSync(outPath, pngBuffer);
      results.push({ path: outPath, method: "svg_fallback" });
    }
  }

  return results;
}
function escapeXml(s = '') {
  return String(s).replace(/[<>&'"]/g, (c) => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":"&apos;",'"':'&quot;'}[c]));
}

async function generatePaletteImage(colors = ['#2b2d7a','#6b21a8','#d97706','#059669','#111827']) {
  const width = 1200, height = 240;
  const swatchWidth = Math.floor(width / colors.length);
  const svgParts = ['<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'">'];
  colors.forEach((c, i) => {
    svgParts.push(`<rect x="${i*swatchWidth}" y="0" width="${swatchWidth}" height="${height}" fill="${c}" />`);
    svgParts.push(`<text x="${i*swatchWidth+12}" y="${height-16}" font-family="Helvetica" font-size="18" fill="${getReadableTextColor(c)}">${c}</text>`);
  });
  svgParts.push('</svg>');
  const svg = svgParts.join('\n');
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const outPath = tmpPath('palette.png');
  await fs.writeFile(outPath, png);
  return outPath;
}

function getReadableTextColor(hex) {
  try {
    const h = hex.replace('#','');
    const r = parseInt(h.substring(0,2),16);
    const g = parseInt(h.substring(2,4),16);
    const b = parseInt(h.substring(4,6),16);
    const lum = (0.299*r + 0.587*g + 0.114*b);
    return lum > 150 ? '#111' : '#fff';
  } catch (e) {
    return '#fff';
  }
}

// Build a long-form executive summary using DB-provided fields (no external LLM)
function assembleExecutiveSummary(idea, brand, launch, tech, validation, extras = {}) {
    console.log('Assembling executive summary with:', { idea, brand, launch, tech, validation, extras });
  const title = idea.idea_text || idea.title || 'Untitled Idea';
  const oneLiner = brand?.tagline || extras.one_liner || `${title} — a transformative product in its niche.`;
  const market = validation?.target_customers ? `Target customers: ${pretty(validation.target_customers, 120)}` : 'Target customers: Not specified.';
  const competition = validation?.competitors ? `Competitors: ${pretty(validation.competitors, 800)}` : 'Competitors: Not specified.';
  const tam = validation?.tam_estimate ? `TAM estimate: ${validation.tam_estimate}` : 'TAM estimate: Not provided.';
  const productSummary = tech?.mvp_features ? `MVP features: ${pretty(tech.mvp_features, 1200)}` : 'MVP/features: Not provided.';
  const gtm = launch?.gtm_strategy ? `Go-to-market: ${pretty(launch.gtm_strategy, 1200)}` : 'GTM: Not provided.';
  const risks = validation?.risks ? `Risks: ${pretty(validation.risks, 1200)}` : 'Risks: Not provided.';
  const recs = validation?.recommendations ? `Recommendations: ${pretty(validation.recommendations, 1200)}` : 'Recommendations: Not provided.';

  // Illustrative valuation language — clearly flagged as projection
  const valuationProjection = 'Illustrative strategic valuation projection: $1,000,000,000,000 (one trillion USD) — this is an optimistic, illustrative scenario assuming global product-market-fit, aggressive monetization and market capture. This is NOT financial advice.';

  return [
    `${BRAND_NAME} — Executive Summary`,
    `Title: ${title}`,
    `One-liner: ${oneLiner}`,
    '',
    `Market & Customers:`,
    market,
    tam,
    '',
    `Competition & Positioning:`,
    competition,
    '',
    `Product & Technology:`,
    productSummary,
    '',
    `Go-to-Market & Growth:`,
    gtm,
    '',
    `Validation & Risks:`,
    risks,
    recs,
    '',
    valuationProjection,
  ].join('\n\n');
}

async function buildPdfReport(idea, artifacts, logosPaths, palettePath, extras = {}) {
  const out = tmpPath('galuxium_report.pdf');
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const stream = fs.createWriteStream(out);
    doc.pipe(stream);

    // Cover
    doc.fontSize(22).fillColor('#111').text(`${BRAND_NAME} — Full Investor Report`, { align: 'left' });
    doc.moveDown(0.4);
    doc.fontSize(12).fillColor('#666').text(`${idea.idea_text || idea.title || 'Untitled Idea'}`, { align: 'left' });
    doc.moveDown(0.6);
    // logo
    try {
      if (logosPaths && logosPaths[0]) doc.image(logosPaths[0], doc.x, doc.y, { fit: [120, 120] });
    } catch (e) {}
    doc.addPage();

    // Executive summary (long)
    const brand = (extras && extras.brandLatest) || artifacts.branding?.[0] || {};
    const launch = (extras && extras.launchLatest) || artifacts.launch?.[0] || {};
    const tech = (extras && extras.techLatest) || artifacts.tech?.[0] || {};
    const validation = (extras && extras.validationLatest) || artifacts.validation?.[0] || {};
    const execText = assembleExecutiveSummary(idea, brand, launch, tech, validation, extras);
    doc.fontSize(14).fillColor('#111').text('Executive Summary', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#222').text(execText, { align: 'left' });

    // Detailed sections
    doc.addPage();
    doc.fontSize(12).text('Market & Validation', { underline: true });
    doc.moveDown(0.2);
    doc.fontSize(10).text(`Target customers: ${pretty(validation.target_customers || validation.target || 'n/a')}`, { continued: false });
    doc.moveDown(0.2);
    doc.text(`TAM / market estimate: ${pretty(validation.tam_estimate || 'n/a')}`);
    doc.moveDown(0.2);
    doc.text('Competitors:');
    doc.fontSize(9).text(pretty(validation.competitors || 'Not provided', 400));

    doc.addPage();
    doc.fontSize(12).text('Product & Technology', { underline: true });
    doc.moveDown(0.2);
    doc.fontSize(10).text('MVP features:');
    doc.fontSize(9).text(pretty(tech.mvp_features || tech.recommended_stack || 'n/a', 1200));
    doc.moveDown(0.3);
    doc.fontSize(10).text('Architecture / API endpoints:');
    doc.fontSize(9).text(pretty(tech.architecture || tech.api_endpoints || 'n/a', 1200));

    doc.addPage();
    doc.fontSize(12).text('Branding & Visual Identity', { underline: true });
    doc.moveDown(0.2);
    doc.fontSize(10).text(`Brand name / tagline: ${brand.brand_name || brand.tagline || 'n/a'}`);
    doc.moveDown(0.2);
    doc.fontSize(10).text('Brand story:');
    doc.fontSize(9).text(pretty(brand.brand_story || brand.narrative || 'n/a', 2000));
    if (palettePath) {
      doc.moveDown(0.5);
      try { doc.image(palettePath, { fit: [420, 140] }); } catch (e) {}
    }

    doc.addPage();
    doc.fontSize(12).text('Go-to-Market & Growth', { underline: true });
    doc.moveDown(0.2);
    doc.fontSize(10).text(pretty(launch.gtm_strategy || launch.marketing_channels || launch.pricing_model || 'n/a', 3000));

    doc.addPage();
    doc.fontSize(12).text('Validation, Risks & Recommendations', { underline: true });
    doc.moveDown(0.2);
    doc.fontSize(10).text(`Validation score: ${validation.validation_score || 'n/a'}`);
    doc.moveDown(0.2);
    doc.fontSize(9).text(pretty(validation.insights || validation.recommendations || validation.risks || 'n/a', 4000));

    // Appendix: raw outputs, files list
    doc.addPage();
    doc.fontSize(12).text('Appendix: Raw outputs & files', { underline: true });
    doc.moveDown(0.2);
    const files = artifacts.files || [];
    if (files.length) {
      files.forEach((f) => {
        doc.fontSize(10).text(`• ${f.filename || f.name || f.id} (${f.created_at || 'n/a'})`);
      });
    } else {
      doc.fontSize(10).text('No files attached.');
    }

    doc.end();
    stream.on('finish', () => resolve(out));
    stream.on('error', reject);
  });
}

async function buildPitchDeck(idea, artifacts, logosPaths, palettePath, extras = {}) {
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE';

  const brand = (extras && extras.brandLatest) || artifacts.branding?.[0] || {};
  const launch = (extras && extras.launchLatest) || artifacts.launch?.[0] || {};
  const tech = (extras && extras.techLatest) || artifacts.tech?.[0] || {};
  const validation = (extras && extras.validationLatest) || artifacts.validation?.[0] || {}; 

  // Cover
  let slide = pres.addSlide();
  slide.addText(`${idea.idea_text || idea.title || 'Untitled'}`, { x: 0.5, y: 0.3, w: '65%', fontSize: 34, bold: true });
  slide.addText(`${brand.tagline || ''}`, { x: 0.5, y: 1.2, fontSize: 14, color: '666666' });
  if (logosPaths[0]) slide.addImage({ path: logosPaths[0], x: 8.2, y: 0.2, w: 1.6, h: 1.6 });

  // Problem
  slide = pres.addSlide();
  slide.addText('Problem / Opportunity', { x: 0.5, y: 0.3, fontSize: 24, bold: true });
  slide.addText(pretty(validation.insights || 'Problem/opportunity not available', 1000), { x: 0.5, y: 1.0, fontSize: 12, w: '85%' });

  // Solution
  slide = pres.addSlide();
  slide.addText('Solution / Product', { x: 0.5, y: 0.3, fontSize: 24, bold: true });
  slide.addText(pretty(tech.mvp_features || tech.recommended_stack || 'Solution details not available', 1200), { x: 0.5, y: 1.0, fontSize: 12, w: '85%' });

  // Market
  slide = pres.addSlide();
  slide.addText('Market & TAM', { x: 0.5, y: 0.3, fontSize: 24, bold: true });
  slide.addText(pretty(validation.tam_estimate || 'TAM not available', 1200), { x: 0.5, y: 1.0, fontSize: 12, w: '85%' });

  // Business model
  slide = pres.addSlide();
  slide.addText('Business Model & Financials (illustrative)', { x: 0.5, y: 0.3, fontSize: 22, bold: true });
  slide.addText(pretty(launch.pricing_model || 'Pricing model not provided', 800), { x: 0.5, y: 1.0, fontSize: 12, w: '85%' });

  // GTM
  slide = pres.addSlide();
  slide.addText('Go-to-Market', { x: 0.5, y: 0.3, fontSize: 24, bold: true });
  slide.addText(pretty(launch.gtm_strategy || launch.marketing_channels || 'GTM not available', 1400), { x: 0.5, y: 1.0, fontSize: 12, w: '85%' });

  // Team / Validation / Risks
  slide = pres.addSlide();
  slide.addText('Validation, Risks & Next Steps', { x: 0.5, y: 0.3, fontSize: 22, bold: true });
  slide.addText(pretty(validation.recommendations || validation.risks || 'Validation details not available', 1400), { x: 0.5, y: 1.0, fontSize: 12, w: '85%' });

  // Branding slide
  slide = pres.addSlide();
  slide.addText('Brand Identity', { x: 0.5, y: 0.3, fontSize: 22, bold: true });
  slide.addText(pretty(brand.brand_story || brand.narrative || 'Brand story not available', 1100), { x: 0.5, y: 1.0, fontSize: 12, w: '60%' });
  if (logosPaths[1]) slide.addImage({ path: logosPaths[1], x: 7.2, y: 1.0, w: 2.0, h: 2.0 });
  if (palettePath) slide.addImage({ path: palettePath, x: 7.2, y: 3.4, w: 2.0, h: 0.6 });

  const out = tmpPath('pitch_deck.pptx');
  await pres.writeFile({ fileName: out });
  return out;
}

// Main route
router.post('/generate', async (req, res) => {
  const { idea_id } = req.body || {};
  if (!idea_id) return res.status(400).json({ error: 'idea_id required in body' });

  try {
    // Fetch primary idea
    const { data: idea, error: ideaErr } = await supabase.from('ideas').select('*').eq('id', idea_id).single();
    if (ideaErr) throw ideaErr;

    // Fetch related datasets in parallel
    const [
      { data: orchestrationLogs },
      { data: startupDocs },
      { data: branding },
      { data: launch },
      { data: tech },
      { data: validation },
      { data: files }
    ] = await Promise.all([
      supabase.from('orchestration_logs').select('*').eq('idea_id', idea_id).order('created_at', { ascending: true }),
      supabase.from('startup_docs').select('*').contains('metadata', { idea_id }).order('created_at', { ascending: true }).limit(50),
      supabase.from('dna_branding').select('*').eq('idea_id', idea_id).order('created_at', { ascending: true }),
      supabase.from('dna_launch').select('*').eq('idea_id', idea_id).order('created_at', { ascending: true }),
      supabase.from('dna_tech').select('*').eq('idea_id', idea_id).order('created_at', { ascending: true }),
      supabase.from('dna_validation').select('*').eq('idea_id', idea_id).order('created_at', { ascending: true }),
      supabase.from('dna_files').select('*').eq('idea_id', idea_id).order('created_at', { ascending: true }),
    ]);

    const artifacts = { orchestrationLogs, startupDocs, branding, launch, tech, validation, files };
    console.log(`Fetched artifacts for idea_id=${idea_id}:`, {
        orchestrationLogs: orchestrationLogs,
        startupDocs: startupDocs,
        branding: branding,
        launch: launch,
        tech: tech,
        validation: validation,
        files: files,
    });
    // Convert some structures to easier-to-use objects (take latest entry per dna table)
    const latest = (arr) => Array.isArray(arr) && arr.length ? arr[arr.length - 1] : {};
    const brandLatest = latest(branding);
    const launchLatest = latest(launch);
    const techLatest = latest(tech);
    const validationLatest = latest(validation);

    // Generate logos (fallback only for now)
    const logoObjs = await generateLogos(idea, 3);
    const logoPaths = logoObjs.map(o => o.path);
 
    // Palette from branding if available
    const palette = brandLatest?.color_palette || brandLatest?.palette || ['#2b2d7a','#6b21a8','#d97706','#059669','#111827'];
    const palettePath = await generatePaletteImage(palette);

    // Build PDF and PPTX
    const pdfPath = await buildPdfReport(idea, artifacts, logoPaths, palettePath, { brandLatest, launchLatest, techLatest, validationLatest });
    const pptxPath = await buildPitchDeck(idea, artifacts, logoPaths, palettePath, { brandLatest, launchLatest, techLatest, validationLatest });

    // Upload assets to the galuxium_reports bucket (REPORT_BUCKET)
    const uploads = { logos: [] };
    for (const [i, p] of logoPaths.entries()) {
      const key = `${idea_id}/logo_${i + 1}.png`;
      const buf = await fs.readFile(p);
      const url = await uploadToSupabaseBucket(key, buf, 'image/png');
      uploads.logos.push(url);
    }

    const paletteBuf = await fs.readFile(palettePath);
    uploads.palette = await uploadToSupabaseBucket(`${idea_id}/palette.png`, paletteBuf, 'image/png');

    const pdfBuf = await fs.readFile(pdfPath);
    uploads.pdf = await uploadToSupabaseBucket(`${idea_id}/galuxium_genesis_report.pdf`, pdfBuf, 'application/pdf');

    const pptxBuf = await fs.readFile(pptxPath);
    uploads.pptx = await uploadToSupabaseBucket(`${idea_id}/investor_pitch_deck.pptx`, pptxBuf, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');

    // Sanity: log uploads object
    console.log('Uploads result:', uploads);

    // --- Robust metadata upsert into a DB table (not the storage bucket) ---
    // Make sure you have a table named `report_metadata` (or set REPORT_METADATA_TABLE env var)
    const { error: upErr } = await supabase
  .from('report_metadata')
  .upsert({
    idea_id,
    report_pdf: uploads.pdf,
    pitch_deck: uploads.pptx,
    logos: uploads.logos,
    palette: uploads.palette,
    bucket_name: 'galuxium_reports',
    report_type: 'full',
    generated_by: 'system',
    metadata: {
      generator_version: 'v2.0',
      brand_name: BRAND_NAME,
      timestamp: new Date().toISOString(),
    },
  });

if (upErr) console.warn('Upsert reports failed:', upErr);


    // Final success response
    res.json({ success: true, uploads });

  } catch (err) {
    console.error('Report generation failed:', err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

module.exports = router;




