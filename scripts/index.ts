import { execFileSync } from "child_process";

const command = process.env.COMMAND;

if (!command) {
  throw new Error("COMMAND environment variable is required");
}

if (command === "setup") {
  execFileSync("node", ["scripts/setup-caprover-app.ts"], {
    stdio: "inherit",
  });
} else if (command === "cleanup") {
  execFileSync("node", ["scripts/cleanup-preview-app.ts"], {
    stdio: "inherit",
  });
} else {
  throw new Error(`Unknown command: ${command}. Must be "setup" or "cleanup".`);
}
