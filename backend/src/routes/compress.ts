import { Router } from "express";
import { upload } from "../middleware/upload";
import { authenticate } from "../middleware/auth";
import { CompressController } from "../controllers/compress.controller";

const router = Router();

// Require an authenticated user: file processing is a paid/protected resource.
// Scoped to the router's own path so unrelated/unknown routes are not affected.
router.use("/api/compress", authenticate);

router.post("/api/compress", upload.single("file"), CompressController.compress);

export default router;
