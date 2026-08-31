import { Router } from "express";
import { upload } from "../middleware/upload";
import { authenticate } from "../middleware/auth";
import { PdfSecurityController } from "../controllers/pdf-security.controller";

const router = Router();

// Require an authenticated user: file processing is a paid/protected resource.
// Scoped to the router's own paths so unrelated/unknown routes are not affected.
router.use("/api/protect", authenticate);
router.use("/api/unlock", authenticate);

router.post("/api/protect", upload.single("file"), PdfSecurityController.protect);
router.post("/api/unlock", upload.single("file"), PdfSecurityController.unlock);

export default router;
