const express = require("express");
const officialSiteController = require("../controllers/officialSiteController");
const { createSharedUpload } = require("./sharedUpload");

const router = express.Router();
const upload = createSharedUpload();

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
