export interface ValidatedEnv {
  caproverPassword: string;
  caproverAppName: string;
  caproverServer: string;
  cleanupStorage: boolean;
  projectName?: string;
}

export function validateCapRoverEnv(): ValidatedEnv {
  const password = process.env.CAPROVER_PASSWORD;
  const appName = process.env.CAPROVER_APP_NAME;
  const server = process.env.CAPROVER_SERVER;
  const cleanupStorage = process.env.CLEANUP_STORAGE !== "false";
  const projectName = process.env.PROJECT_NAME;

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
    cleanupStorage,
    projectName: projectName || undefined,
  };
}
