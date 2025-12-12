import { cleanupPreviewApp } from "./cleanup-preview-app.ts";
import { setupCaproverApp } from "./setup-caprover-app.ts";

const command = process.env.COMMAND;

if (!command) {
  throw new Error("COMMAND environment variable is required");
}

if (command === "setup") {
  await setupCaproverApp();
} else if (command === "cleanup") {
  await cleanupPreviewApp();
} else {
  throw new Error(`Unknown command: ${command}. Must be "setup" or "cleanup".`);
}
