import type { IAppDef } from "../models/index.ts";
import { validateAppConfig } from "./validateAppConfig.ts";

/**
 * Checks if a config object has any meaningful content that needs to be saved
 * @param config - Configuration object to check
 * @returns true if config has any properties, false if empty
 */

export function configNeedsSaving(
  currentConfig: IAppDef,
  expectedConfig: Partial<IAppDef>
): boolean {
  if (
    currentConfig.appDeployTokenConfig?.enabled !==
    expectedConfig.appDeployTokenConfig?.enabled
  ) {
    return true;
  }
  const validatedCurrent = validateAppConfig(currentConfig);

  // Deep compare
  function deepEqual(a: any, b: any): boolean {
    if (typeof a !== typeof b) return false;
    if (typeof a !== "object" || a === null || b === null) {
      return a === b;
    }
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return !deepEqual(validatedCurrent, expectedConfig);
}
