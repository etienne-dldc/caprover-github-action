import * as caprover from "./caprover.js";
import { validateCapRoverEnv } from "./utils.js";

export async function cleanupPreviewApp(): Promise<void> {
  const env = validateCapRoverEnv();
  const { token } = await caprover.login(
    env.caproverServer,
    env.caproverPassword
  );

  // Use app name directly from environment
  const appName = env.caproverAppName;

  console.log(`Checking for app: ${appName}`);

  // Get all apps and check if our app exists
  const appsResponse = await caprover.getAllApps(env.caproverServer, token);
  const appDef = appsResponse.appDefinitions?.find(
    (app) => app.appName === appName
  );

  if (!appDef) {
    console.log(`App "${appName}" not found. Nothing to delete.`);
    process.exit(0);
  }

  console.log(`Found app "${appName}". Deleting...`);

  try {
    // Delete the app with all its volumes
    await caprover.deleteApp(env.caproverServer, token, appName, [], undefined);
    console.log(`App "${appName}" deleted successfully.`);
  } catch (error) {
    throw new Error(
      `Failed to delete app "${appName}": ${
        error && (error as Error).message
          ? (error as Error).message
          : String(error)
      }`
    );
  }
}
