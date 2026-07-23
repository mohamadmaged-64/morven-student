import express from "express";
import cors from "cors";
import healthRoutes from "./routes/health";
import convertRoutes from "./routes/convert";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/", healthRoutes);
app.use("/", convertRoutes);

export default app;
