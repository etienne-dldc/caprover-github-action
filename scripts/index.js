import { execSync } from "child_process";

const command = process.env.COMMAND;

if (!command) {
  throw new Error("COMMAND environment variable is required");
}

if (command === "setup") {
  execSync("node scripts/setup-caprover-app.js", { stdio: "inherit" });
} else if (command === "cleanup") {
  execSync("node scripts/cleanup-preview-app.js", {
    stdio: "inherit",
  });
} else {
  throw new Error(`Unknown command: ${command}. Must be "setup" or "cleanup".`);
}
