import "dotenv/config";
import app from "./app";

const PORT = Number(process.env.PORT) || 3001;
const HOST = "0.0.0.0";

// Keep the process alive on stray async failures instead of crashing.
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});

const server = app.listen(PORT, HOST, () => {
  console.log(`Morven Backend running on http://${HOST}:${PORT}`);
});

server.on("error", (err) => {
  console.error("Morven Backend failed to start:", err);
  process.exit(1);
});
