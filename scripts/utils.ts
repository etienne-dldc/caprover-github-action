import * as v from "valibot";

interface ValidatedEnv {
  caproverPassword: string;
  caproverAppName: string;
  caproverServer: string;
}

export function validateCapRoverEnv(): ValidatedEnv {
  const password = process.env.CAPROVER_PASSWORD;
  const appName = process.env.CAPROVER_APP_NAME;
  const server = process.env.CAPROVER_SERVER;

  const missing: string[] = [];
  if (!password) missing.push("CAPROVER_PASSWORD");
  if (!appName) missing.push("CAPROVER_APP_NAME");
  if (!server) missing.push("CAPROVER_SERVER");

  if (missing.length > 0) {
    throw new Error(
      `Missing required CapRover environment variables: ${missing.join(", ")}`
    );
  }

  return {
    caproverPassword: password as string,
    caproverAppName: appName as string,
    caproverServer: server as string,
  };
}

export function getAppName(baseName: string): string {
  const isMainBranch = process.env.GITHUB_REF === "refs/heads/main";
  const appName = isMainBranch
    ? baseName
    : `${baseName}--${
        process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME
      }`;
  return appName;
}

// Valibot schemas for CapRover configuration
const IAppEnvVarSchema = v.object({
  key: v.string(),
  value: v.string(),
});

const IAppVolumeSchema = v.object({
  containerPath: v.string(),
  volumeName: v.optional(v.string()),
  hostPath: v.optional(v.string()),
  mode: v.optional(v.string()),
});

const IAppPortSchema = v.object({
  containerPort: v.number(),
  hostPort: v.number(),
  protocol: v.optional(v.union([v.literal("tcp"), v.literal("udp")])),
  publishMode: v.optional(v.union([v.literal("ingress"), v.literal("host")])),
});

const AppConfigSchema = v.object({
  envVars: v.optional(
    v.union([v.array(IAppEnvVarSchema), v.record(v.string(), v.unknown())])
  ),
  volumes: v.optional(
    v.union([v.array(IAppVolumeSchema), v.record(v.string(), v.unknown())])
  ),
  ports: v.optional(
    v.union([v.array(IAppPortSchema), v.record(v.string(), v.number())])
  ),
  description: v.optional(v.string()),
  forceSsl: v.optional(v.union([v.literal(true), v.literal(false)])),
  websocketSupport: v.optional(v.union([v.literal(true), v.literal(false)])),
  instanceCount: v.optional(v.number()),
  containerHttpPort: v.optional(v.number()),
  redirectDomain: v.optional(v.string()),
  customNginxConfig: v.optional(v.string()),
});

export function parseConfig(
  configJson: string | null | undefined
): Record<string, unknown> {
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
    const validatedConfig = v.parse(AppConfigSchema, config);

    // Transform envVars from object format to array format if needed
    if (validatedConfig.envVars && !Array.isArray(validatedConfig.envVars)) {
      validatedConfig.envVars = Object.entries(validatedConfig.envVars).map(
        ([key, value]) => ({
          key,
          value: String(value),
        })
      );
    }

    // Transform volumes from object format to array format if needed
    if (validatedConfig.volumes && !Array.isArray(validatedConfig.volumes)) {
      validatedConfig.volumes = Object.entries(validatedConfig.volumes).map(
        ([containerPath, pathOrVolume]) => {
          const volume: {
            containerPath: string;
            hostPath?: string;
            volumeName?: string;
          } = { containerPath };
          if (String(pathOrVolume).startsWith("/")) {
            volume.hostPath = String(pathOrVolume);
          } else {
            volume.volumeName = String(pathOrVolume);
          }
          return volume;
        }
      );
    }

    // Transform ports from object format to array format if needed
    if (validatedConfig.ports && !Array.isArray(validatedConfig.ports)) {
      validatedConfig.ports = Object.entries(validatedConfig.ports).map(
        ([containerPort, hostPort]) => ({
          containerPort: Number(containerPort),
          hostPort: Number(hostPort),
        })
      );
    }

    return validatedConfig as Record<string, unknown>;
  } catch (error) {
    throw new Error(`Invalid config format: ${(error as Error).message}`);
  }
}
