/**
 * Merges two config objects with proper handling of arrays (envVars, volumes, ports)
 * @param baseConfig - Base configuration (lower priority)
 * @param overrideConfig - Configuration to merge in (higher priority)
 * @returns Merged configuration
 */

import type {
  IAppDef,
  IAppEnvVar,
  IAppPort,
  IAppVolume,
} from "../models/index.ts";

export function mergeConfigs(
  baseConfig: Partial<IAppDef>,
  overrideConfig: Partial<IAppDef>
): Partial<IAppDef> {
  const result: Partial<IAppDef> = { ...baseConfig };

  // Merge envVars by key
  if (baseConfig.envVars && overrideConfig.envVars) {
    const merged: Record<string, IAppEnvVar> = {};
    baseConfig.envVars.forEach((item) => {
      merged[item.key] = item;
    });
    overrideConfig.envVars.forEach((item) => {
      merged[item.key] = item;
    });
    result.envVars = Object.values(merged);
  } else if (overrideConfig.envVars) {
    result.envVars = overrideConfig.envVars;
  }

  // Merge volumes by containerPath
  if (baseConfig.volumes && overrideConfig.volumes) {
    const merged: Record<string, IAppVolume> = {};
    baseConfig.volumes.forEach((item) => {
      merged[item.containerPath] = item;
    });
    overrideConfig.volumes.forEach((item) => {
      merged[item.containerPath] = item;
    });
    result.volumes = Object.values(merged);
  } else if (overrideConfig.volumes) {
    result.volumes = overrideConfig.volumes;
  }

  // Merge ports by containerPort
  if (baseConfig.ports && overrideConfig.ports) {
    const merged: Record<string, IAppPort> = {};
    baseConfig.ports.forEach((item) => {
      merged[String(item.containerPort)] = item;
    });
    overrideConfig.ports.forEach((item) => {
      merged[String(item.containerPort)] = item;
    });
    result.ports = Object.values(merged);
  } else if (overrideConfig.ports) {
    result.ports = overrideConfig.ports;
  }

  // Merge other properties (override takes precedence)
  for (const [key, value] of Object.entries(overrideConfig)) {
    if (key !== "envVars" && key !== "volumes" && key !== "ports") {
      (result as Record<string, unknown>)[key] = value;
    }
  }

  return result;
}
