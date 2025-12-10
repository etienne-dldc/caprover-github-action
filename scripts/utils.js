import CapRoverAPI, { SimpleAuthenticationProvider } from "caprover-api";

export function createCapRoverAPI(password, serverUrl) {
  const authProvider = new SimpleAuthenticationProvider(() => {
    return Promise.resolve({ password, otpToken: undefined });
  });

  return new CapRoverAPI(serverUrl, authProvider);
}

export function validateCapRoverEnv() {
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

export function getAppName(baseName) {
  const isMainBranch = process.env.GITHUB_REF === "refs/heads/main";
  const appName = isMainBranch
    ? baseName
    : `${baseName}--${
        process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME
      }`;
  return appName;
}

// Helper function to wait for a specified time (in milliseconds)
export function waitFor(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
