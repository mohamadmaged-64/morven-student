import { Router } from "express";
import { upload } from "../middleware/upload";
import { ConvertController } from "../controllers/convert.controller";

const router = Router();

router.post("/api/convert", upload.single("file"), ConvertController.convert);

export default router;
