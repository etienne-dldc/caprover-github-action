import type { IAppDef } from "../models/index.ts";
import { validateAppConfig } from "./validateAppConfig.ts";

export function parseConfig(
  configJson: string | null | undefined
): Partial<IAppDef> {
  if (!configJson) {
    return {};
  }

  try {
    const config = JSON.parse(configJson);
    if (
      typeof config !== "object" ||
      config === null ||
      Array.isArray(config)
    ) {
      throw new Error("Config must be a JSON object");
    }
    // Validate config against schema
    return validateAppConfig(config);
  } catch (error) {
    throw new Error(`Invalid config format`, {
      cause: error,
    });
  }
}
