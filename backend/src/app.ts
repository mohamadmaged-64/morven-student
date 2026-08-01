import express from "express";
import cors from "cors";
import healthRoutes from "./routes/health";
import convertRoutes from "./routes/convert";
import aiRoutes from "./routes/ai";

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use("/", healthRoutes);
app.use("/", convertRoutes);
app.use("/", aiRoutes);

export default app;
