const express = require("express");
const multer = require("multer");
const officialSiteController = require("../controllers/officialSiteController");
const config = require("../config");

const router = express.Router();
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: config.uploads.fileSizeBytes,
    fieldSize: config.uploads.fieldSizeBytes,
    files: config.uploads.files,
  },
});

router.get("/news", officialSiteController.listPublicNews);
router.get("/news/:id", officialSiteController.getPublicNewsDetail);
router.get("/exposures", officialSiteController.listPublicExposures);
router.get("/exposures/:id", officialSiteController.getPublicExposureDetail);
router.post(
  "/exposures/assets",
  upload.single("file"),
  officialSiteController.uploadExposureAsset,
);
router.post("/exposures", officialSiteController.createExposure);
router.post("/cooperations", officialSiteController.createCooperation);
router.post("/support/sessions", officialSiteController.createSupportSession);
router.get(
  "/support/sessions/:token/socket-token",
  officialSiteController.getSupportSocketToken,
);
router.get(
  "/support/sessions/:token/messages",
  officialSiteController.listSupportMessagesByToken,
);
router.post(
  "/support/sessions/:token/messages",
  officialSiteController.appendVisitorSupportMessage,
);

module.exports = router;
