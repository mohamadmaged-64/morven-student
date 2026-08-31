import { Router } from "express";
import { upload } from "../middleware/upload";
import { authenticate } from "../middleware/auth";
import { ConvertController } from "../controllers/convert.controller";

const router = Router();

// Require an authenticated user: file processing is a paid/protected resource.
// Scoped to the router's own path so unrelated/unknown routes are not affected.
router.use("/api/convert", authenticate);

router.post("/api/convert", upload.single("file"), ConvertController.convert);

export default router;
