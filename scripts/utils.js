const CapRoverAPI = require("caprover-api").default;
const { SimpleAuthenticationProvider } = require("caprover-api");
const v = require("valibot");

function createCapRoverAPI(password, serverUrl) {
  const authProvider = new SimpleAuthenticationProvider(() => {
    return Promise.resolve({ password, otpToken: undefined });
  });

  return new CapRoverAPI(serverUrl, authProvider);
}

function validateCapRoverEnv() {
  const password = process.env.CAPROVER_PASSWORD;
  const appName = process.env.CAPROVER_APP_NAME;
  const server = process.env.CAPROVER_SERVER;

  const missing = [];
  if (!password) missing.push("CAPROVER_PASSWORD");
  if (!appName) missing.push("CAPROVER_APP_NAME");
  if (!server) missing.push("CAPROVER_SERVER");

  if (missing.length > 0) {
    throw new Error(
      `Missing required CapRover environment variables: ${missing.join(", ")}`
    );
  }

  return {
    caproverPassword: password,
    caproverAppName: appName,
    caproverServer: server,
  };
}

function getAppName(baseName) {
  const isMainBranch = process.env.GITHUB_REF === "refs/heads/main";
  const appName = isMainBranch
    ? baseName
    : `${baseName}--${
        process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME
      }`;
  return appName;
}

// Helper function to wait for a specified time (in milliseconds)
function waitFor(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    v.union([v.array(IAppEnvVarSchema), v.record(v.string())])
  ),
  volumes: v.optional(
    v.union([v.array(IAppVolumeSchema), v.record(v.string())])
  ),
  ports: v.optional(v.union([v.array(IAppPortSchema), v.record(v.number())])),
  description: v.optional(v.string()),
  forceSsl: v.optional(v.union([v.literal(true), v.literal(false)])),
  websocketSupport: v.optional(v.union([v.literal(true), v.literal(false)])),
  instanceCount: v.optional(v.number()),
  containerHttpPort: v.optional(v.number()),
  redirectDomain: v.optional(v.string()),
  customNginxConfig: v.optional(v.string()),
});

function parseConfig(configJson) {
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
          const volume = { containerPath };
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

    return validatedConfig;
  } catch (error) {
    throw new Error(`Invalid config format: ${error.message}`);
  }
}

module.exports = {
  createCapRoverAPI,
  validateCapRoverEnv,
  getAppName,
  waitFor,
  parseConfig,
};
