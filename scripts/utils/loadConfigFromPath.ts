import type { IAppDef } from "../models/index.ts";
import { validateAppConfig } from "./validateAppConfig.ts";

/**
 * Loads configuration from a file path and validates it
 * @param filePath - Path to the JSON configuration file
 * @returns Parsed and validated configuration
 */

export function loadConfigFromPath(filePath: string): Partial<IAppDef> {
  const { readFileSync } = require("fs");

  try {
    const fileContent = readFileSync(filePath, "utf-8");
    const config = JSON.parse(fileContent);
    if (
      typeof config !== "object" ||
      config === null ||
      Array.isArray(config)
    ) {
      throw new Error("Config file must contain a JSON object");
    }
    return validateAppConfig(config);
  } catch (error) {
    throw new Error(`Failed to load config from ${filePath}`, {
      cause: error,
    });
  }
}
