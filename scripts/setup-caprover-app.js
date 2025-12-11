const { appendFileSync } = require("fs");
const {
  createCapRoverAPI,
  validateCapRoverEnv,
  waitFor,
  parseConfig,
} = require("./utils");

async function main() {
  const env = validateCapRoverEnv();
  const caprover = createCapRoverAPI(env.caproverPassword, env.caproverServer);

  // Use app name directly from environment
  const appName = env.caproverAppName;

  console.log(`Checking for app: ${appName}`);

  // Get all apps and check if our app exists
  let allAppDefs = await caprover.getAllApps();
  await waitFor(100);
  let appDef =
    allAppDefs.appDefinitions?.find((app) => app.appName === appName) || null;

  if (!appDef) {
    console.log(`App "${appName}" not found. Creating it...`);

    try {
      // Register the new app with settings from environment
      const hasPersistentData = process.env.HAS_PERSISTENT_DATA === "true";
      await caprover.registerNewApp(appName, "", hasPersistentData, false);
      console.log(`App "${appName}" created successfully.`);
      await waitFor(500);

      // Fetch app definition
      const appsAfterCreate = await caprover.getAllApps();
      appDef =
        appsAfterCreate.appDefinitions?.find(
          (app) => app.appName === appName
        ) || null;

      if (!appDef) {
        throw new Error(`Failed to fetch newly created app "${appName}"`);
      }
    } catch (error) {
      throw new Error(
        `Failed to create app "${appName}": ${
          error && error.message ? error.message : String(error)
        }`
      );
    }
  }

  if (!appDef) {
    throw new Error(`Could not find app "${appName}" after setup`);
  }

  // Enable SSL for the base domain (if enabled)
  const enableSsl = process.env.ENABLE_SSL !== "false";
  if (enableSsl && !appDef.hasDefaultSubDomainSsl) {
    console.log(`Enabling SSL for app "${appName}"...`);
    try {
      await caprover.enableSslForBaseDomain(appName);
      await waitFor(100);
      console.log(`SSL enabled for app "${appName}".`);
    } catch (sslError) {
      console.warn(
        `Warning: Failed to enable SSL: ${
          sslError && sslError.message ? sslError.message : String(sslError)
        }`
      );
      console.log("Continuing without SSL...");
    }
  }

  // Accumulate all configuration changes
  let hasChanges = false;

  // Enable app deploy token
  if (!appDef.appDeployTokenConfig?.enabled) {
    appDef.appDeployTokenConfig = {
      enabled: true,
    };
    hasChanges = true;
  }

  // Apply custom config if provided
  const configJson = process.env.CONFIG;
  if (configJson) {
    try {
      const customConfig = parseConfig(configJson);
      Object.assign(appDef, customConfig);
      hasChanges = true;
    } catch (error) {
      throw new Error(
        `Failed to parse config: ${
          error && error.message ? error.message : String(error)
        }`
      );
    }
  }

  // Save all changes at once
  if (hasChanges) {
    console.log(`Updating app "${appName}"...`);
    await caprover.updateConfigAndSave(appName, appDef);
    await waitFor(500);
  }

  // Fetch final app state to ensure all changes are applied
  allAppDefs = await caprover.getAllApps();
  await waitFor(100);
  appDef =
    allAppDefs.appDefinitions?.find((app) => app.appName === appName) || null;

  const appToken = appDef.appDeployTokenConfig?.appDeployToken;
  if (!appToken) {
    throw new Error(`No deploy token found for app "${appName}"`);
  }

  console.log(`App "${appName}" is ready with deploy token.`);

  // Set outputs using GitHub Actions environment file
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    appendFileSync(outputFile, `app-token=${appToken}\n`);
  }
}

main().catch((err) => {
  console.error("Error during setup:", err);
  process.exit(1);
});
