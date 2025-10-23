const express = require("express");
const router = express.Router();
const mvpController = require("../controllers/mvpController");

router.get("/generate-stream", mvpController.streamGenerateMVP);
router.get("/download/:projectName", mvpController.downloadZip);

module.exports = router;
