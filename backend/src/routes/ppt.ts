import { Router } from "express";
import { upload } from "../middleware/upload";
import { PptController } from "../controllers/ppt.controller";

const router = Router();

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
