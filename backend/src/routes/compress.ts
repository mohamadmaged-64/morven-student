import { Router } from "express";
import { upload } from "../middleware/upload";
import { CompressController } from "../controllers/compress.controller";

const router = Router();

router.post("/api/compress", upload.single("file"), CompressController.compress);

export default router;
