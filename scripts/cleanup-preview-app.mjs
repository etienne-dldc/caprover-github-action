import { createCapRoverAPI, validateCapRoverEnv } from "./utils.mjs";

async function main() {
  const env = validateCapRoverEnv();
  const caprover = createCapRoverAPI(env.caproverPassword, env.caproverServer);

  // Use app name directly from environment
  const appName = env.caproverAppName;

  console.log(`Checking for app: ${appName}`);

  // Get all apps and check if our app exists
  const appsResponse = await caprover.getAllApps();
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
    await caprover.deleteApp(appName, [], undefined);
    console.log(`App "${appName}" deleted successfully.`);
  } catch (error) {
    throw new Error(
      `Failed to delete app "${appName}": ${
        error && error.message ? error.message : String(error)
      }`
    );
  }
}

main().catch((err) => {
  console.error("Error during cleanup:", err);
  process.exit(1);
});
