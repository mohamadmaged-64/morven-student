import { Router, Request, Response } from "express";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json({
    status: "Morven Backend Running",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

router.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

router.get("/healthz", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

export default router;
