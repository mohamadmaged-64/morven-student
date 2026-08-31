import { Router } from "express";
import { upload } from "../middleware/upload";
import { authenticate } from "../middleware/auth";
import { PptController } from "../controllers/ppt.controller";

const router = Router();

// Require an authenticated user: file processing is a paid/protected resource.
// Scoped to the router's own path so unrelated/unknown routes are not affected.
router.use("/api/ppt", authenticate);

router.post(
  "/api/ppt/number-slides",
  upload.single("file"),
  PptController.numberSlides
);

router.post(
  "/api/ppt/generate-from-text",
  PptController.generateFromText
);

router.post(
  "/api/ppt/generate-from-pdf",
  upload.single("file"),
  PptController.generateFromPdf
);

router.post(
  "/api/ppt/split",
  upload.single("file"),
  PptController.split
);

router.post(
  "/api/ppt/merge",
  upload.array("files", 20),
  PptController.merge
);

export default router;
