import { Router } from "express";
import { upload } from "../middleware/upload";
import { PdfSecurityController } from "../controllers/pdf-security.controller";

const router = Router();

router.post("/api/protect", upload.single("file"), PdfSecurityController.protect);
router.post("/api/unlock", upload.single("file"), PdfSecurityController.unlock);

export default router;
