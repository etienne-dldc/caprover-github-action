import * as caprover from "./caprover.ts";
import { validateCapRoverEnv, withRetry } from "./utils.ts";

export async function cleanupPreviewApp(): Promise<void> {
  const env = validateCapRoverEnv();
  const { token } = await withRetry(() =>
    caprover.login(env.caproverServer, env.caproverPassword)
  );

  // Use app name directly from environment
  const appName = env.caproverAppName;

  console.log(`Checking for app: ${appName}`);

  // Get all apps and check if our app exists
  const appsResponse = await withRetry(() =>
    caprover.getAllApps(env.caproverServer, token)
  );
  const appDef = appsResponse.appDefinitions?.find(
    (app) => app.appName === appName
  );

  if (!appDef) {
    console.log(`App "${appName}" not found. Nothing to delete.`);
    process.exit(0);
  }

  console.log(`Found app "${appName}". Deleting...`);

  try {
    // Extract volume names if cleanup-storage is enabled
    const volumesToDelete = env.cleanupStorage
      ? (appDef.volumes || []).map((vol) => vol.volumeName).filter(Boolean)
      : [];

    if (env.cleanupStorage) {
      console.log(
        `Cleanup storage: ${env.cleanupStorage}, volumes to delete: ${
          volumesToDelete.join(", ") || "none"
        }`
      );
    }

    // Delete the app with volumes if cleanup-storage is enabled
    await withRetry(() =>
      caprover.deleteApp(
        env.caproverServer,
        token,
        appName,
        volumesToDelete,
        undefined
      )
    );
    console.log(`App "${appName}" deleted successfully.`);
  } catch (error) {
    throw new Error(`Failed to delete app "${appName}"`, {
      cause: error,
    });
  }
}
